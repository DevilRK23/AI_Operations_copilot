from datetime import datetime
import os

os.environ["HF_HOME"] = "./hf_cache"
os.environ["TRANSFORMERS_CACHE"] = "./hf_cache"

import chromadb
from sentence_transformers import SentenceTransformer
from services.log_parser import parse_file_to_chunks

# ==========================================
# EMBEDDING MODEL
# ==========================================

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

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

def index_file(filepath, filename):
    chunks = parse_file_to_chunks(filepath)
    if not chunks:
        return
    
    try:
        # Delete existing items matching source filename
        collection.delete(where={"source": filename})
        # Delete direct ID match too, in case of older structure
        collection.delete(ids=[filename])
    except Exception as e:
        print(f"Error clearing previous index for {filename}: {str(e)}")
        
    documents = [c["content"] for c in chunks]
    embeddings = [model.encode(c["content"]).tolist() for c in chunks]
    ids = [f"{filename}_chunk_{i}" for i in range(len(chunks))]
    metadatas = []
    
    for i, c in enumerate(chunks):
        meta = {
            "source": filename,
            "chunk_index": i,
            "uploaded_at": str(datetime.utcnow()),
            **c.get("metadata", {})
        }
        metadatas.append(meta)
        
    collection.add(
        documents=documents,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas
    )
    print(f"Indexed {len(chunks)} chunks for {filename}")

def add_log(log_text, filename):
    # Backward compatible helper
    filepath = f"uploads/{filename}"
    if os.path.exists(filepath):
        index_file(filepath, filename)
    else:
        # Fallback if no file exists on disk
        embedding = model.encode(log_text).tolist()
        try:
            collection.delete(where={"source": filename})
            collection.delete(ids=[filename])
        except:
            pass
        collection.add(
            documents=[log_text],
            embeddings=[embedding],
            ids=[filename],
            metadatas=[{
                "source": filename,
                "type": "universal_doc",
                "uploaded_at": str(datetime.utcnow())
            }]
        )

# ==========================================
# SEARCH LOGS
# ==========================================

def search_logs(query):
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

    query_embedding = model.encode(
        query_text
    ).tolist()

    total_logs = len(
        collection.get()["ids"]
    )

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(
            10,
            max(1, total_logs)
        )
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

def get_total_incidents():
    results = collection.get()
    if not results or "metadatas" not in results or not results["metadatas"]:
        return 0
    sources = set()
    for meta in results["metadatas"]:
        if meta and "source" in meta:
            sources.add(meta["source"])
    return len(sources) if sources else len(results["ids"])

def get_recent_incidents(limit=10):
    results = collection.get()
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