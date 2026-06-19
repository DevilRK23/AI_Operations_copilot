from datetime import datetime
import os
import requests
import chromadb
from services.log_parser import parse_file_to_chunks

# ==========================================
# SERVERLESS HUGGING FACE EMBEDDINGS
# ==========================================

HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HF_API_KEY")
API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"

def get_embeddings(texts):
    if not texts:
        return []
    is_single = isinstance(texts, str)
    inputs = [texts] if is_single else list(texts)
    
    headers = {}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
        
    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": inputs}, timeout=20)
        if response.status_code == 200:
            result = response.json()
            return result[0] if is_single else result
        else:
            print(f"HF API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Serverless embedding error: {str(e)}")
    
    # Fallback: return zero vectors of length 384 (all-MiniLM-L6-v2 dimension)
    print("Warning: HF API failed, falling back to zero embeddings")
    zero_vector = [0.0] * 384
    return zero_vector if is_single else [zero_vector] * len(inputs)

# ==========================================
# CHROMA DB
# ==========================================

client = chromadb.PersistentClient(
    path="./vector_db"
)

collection = client.get_or_create_collection(
    name="incident_logs"
)

# ==========================================
# ADD / INDEX LOG
# ==========================================

def index_file(filepath, filename, user_id=None):
    chunks = parse_file_to_chunks(filepath)
    if not chunks:
        return
    
    try:
        # Delete existing items matching source filename and user_id to avoid duplication
        if user_id is not None:
            # Check if Chroma supports where filter delete
            collection.delete(where={"$and": [{"source": filename}, {"user_id": user_id}]})
        else:
            collection.delete(where={"source": filename})
            collection.delete(ids=[filename])
    except Exception as e:
        # If $and is not supported or errors, fallback to standard delete
        try:
            collection.delete(where={"source": filename})
        except Exception as inner_e:
            print(f"Error clearing previous index for {filename}: {str(inner_e)}")
        
    documents = [c["content"] for c in chunks]
    embeddings = get_embeddings(documents)
    ids = [f"{filename}_user_{user_id}_chunk_{i}" if user_id is not None else f"{filename}_chunk_{i}" for i in range(len(chunks))]
    metadatas = []
    
    for i, c in enumerate(chunks):
        meta = {
            "source": filename,
            "chunk_index": i,
            "uploaded_at": str(datetime.utcnow()),
            **c.get("metadata", {})
        }
        if user_id is not None:
            meta["user_id"] = user_id
        metadatas.append(meta)
        
    collection.add(
        documents=documents,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas
    )
    print(f"Indexed {len(chunks)} chunks for {filename} (User ID: {user_id})")

def add_log(log_text, filename, user_id=None):
    # Backward compatible helper
    filepath = f"uploads/{filename}"
    if os.path.exists(filepath):
        index_file(filepath, filename, user_id)
    else:
        # Fallback if no file exists on disk
        embedding = get_embeddings(log_text)
        try:
            if user_id is not None:
                collection.delete(where={"$and": [{"source": filename}, {"user_id": user_id}]})
            else:
                collection.delete(where={"source": filename})
                collection.delete(ids=[filename])
        except:
            pass
        
        meta = {
            "source": filename,
            "type": "universal_doc",
            "uploaded_at": str(datetime.utcnow())
        }
        if user_id is not None:
            meta["user_id"] = user_id
            
        doc_id = f"{filename}_user_{user_id}" if user_id is not None else filename
        
        collection.add(
            documents=[log_text],
            embeddings=[embedding],
            ids=[doc_id],
            metadatas=[meta]
        )

# ==========================================
# SEARCH LOGS
# ==========================================

def search_logs(query, user_id=None):
    filename = query
    is_file = False
    
    filepath = f"uploads/{filename}"
    if os.path.exists(filepath):
        is_file = True
    elif any(query.lower().endswith(ext) for ext in [".log", ".txt", ".csv", ".json", ".pdf", ".yaml", ".xml", ".md"]):
        filepath = f"uploads/{query}"
        if os.path.exists(filepath):
            is_file = True

    if is_file:
        from services.log_parser import read_logs
        query_text = read_logs(filepath)
    else:
        query_text = query

    query_embedding = get_embeddings(query_text)

    # Filter by user if specified
    where_filter = {"user_id": user_id} if user_id is not None else None

    # Get matching records
    try:
        all_ids = collection.get(where=where_filter)["ids"]
        total_logs = len(all_ids)
    except Exception:
        total_logs = 10

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(10, max(1, total_logs)),
        where=where_filter
    )

    # Remove self-match
    filtered_ids = []
    filtered_docs = []
    filtered_distances = []
    filtered_metadata = []

    if results.get("ids") and len(results["ids"]) > 0:
        for idx, incident_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][idx] if results.get("metadatas") else {}
            source = meta.get("source") if meta else None
            
            # Skip if ID matches filename, or if metadata source matches query
            if incident_id == query or (source and source == query):
                continue

            filtered_ids.append(incident_id)
            filtered_docs.append(results["documents"][0][idx])
            filtered_distances.append(results["distances"][0][idx])
            if results.get("metadatas"):
                filtered_metadata.append(results["metadatas"][0][idx])

    results["ids"] = [filtered_ids]
    results["documents"] = [filtered_docs]
    results["distances"] = [filtered_distances]
    if results.get("metadatas"):
        results["metadatas"] = [filtered_metadata]

    return results

# ==========================================
# DASHBOARD HELPERS
# ==========================================

def get_total_incidents(user_id=None):
    where_filter = {"user_id": user_id} if user_id is not None else None
    results = collection.get(where=where_filter)
    if not results or "metadatas" not in results or not results["metadatas"]:
        return 0
    sources = set()
    for meta in results["metadatas"]:
        if meta and "source" in meta:
            sources.add(meta["source"])
    return len(sources) if sources else len(results["ids"])

def get_recent_incidents(limit=10, user_id=None):
    where_filter = {"user_id": user_id} if user_id is not None else None
    results = collection.get(where=where_filter)
    if not results or "metadatas" not in results or not results["metadatas"]:
        return []
    
    unique_sources = []
    seen = set()
    
    for meta in reversed(results["metadatas"]):
        if meta and "source" in meta:
            source = meta["source"]
            if source not in seen:
                seen.add(source)
                unique_sources.append(source)
                if len(unique_sources) >= limit:
                    break
                    
    return unique_sources

def get_all_incidents():
    return collection.get()

def get_collection():
    return collection