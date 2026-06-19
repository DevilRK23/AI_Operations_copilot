import chromadb
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv
from pathlib import Path
import os
import json
import re 
import traceback
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

# Imports of local modules
from services.log_parser import read_logs, parse_file_to_chunks
from services.rag_service import (
    add_log,
    search_logs,
    get_total_incidents,
    get_recent_incidents
)
from services.report_service import generate_report
from services.db_service import (
    init_db,
    create_user,
    get_user_by_username,
    get_user_by_id,
    update_user_api_key
)
from services.auth_service import (
    get_current_user,
    create_access_token,
    get_password_hash,
    verify_password
)
from services.agent_workflow import run_agent_analysis

# ==========================================
# ENVIRONMENT SETUP
# ==========================================

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

print("GROQ LOADED:", os.getenv("GROQ_API_KEY") is not None)

groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)
client = chromadb.PersistentClient(
    path="./vector_db"
)

collection = client.get_or_create_collection(
    name="incident_logs"
)

# ==========================================
# PYDANTIC SCHEMAS FOR AUTH
# ==========================================

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

# ==========================================
# FASTAPI APP
# ==========================================

app = FastAPI(
    title="AI Operations Copilot",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# ==========================================
# PUBLIC API - HOME & HEALTH
# ==========================================

@app.get("/")
def home():
    return {
        "message": "AI Operations Copilot Running"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "vector_db": "connected",
        "llm": "available",
        "timestamp": datetime.utcnow().isoformat()
    }

# ==========================================
# AUTH ENDPOINTS
# ==========================================

@app.post("/auth/register")
def register(user_data: UserRegister):
    existing = get_user_by_username(user_data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    hashed = get_password_hash(user_data.password)
    user_id = create_user(user_data.username, user_data.email, hashed)
    if not user_id:
        raise HTTPException(status_code=400, detail="Registration failed")
        
    return {"message": "Registration successful", "user_id": user_id}

@app.post("/auth/login")
def login(login_data: UserLogin):
    user = get_user_by_username(login_data.username)
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    token = create_access_token({"sub": str(user["id"])})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"]
    }

@app.get("/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "api_key": current_user["api_key"]
    }

@app.post("/auth/api-key")
def generate_api_key(current_user: dict = Depends(get_current_user)):
    new_key = f"ops_copilot_{uuid.uuid4().hex}"
    update_user_api_key(current_user["id"], new_key)
    return {"api_key": new_key}

# ==========================================
# PUBLIC DEMO ENDPOINT (UNPROTECTED)
# ==========================================

@app.get("/ask")
def ask(question: str):
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """
                    You are an AI Copilot Assistant.
                    Help engineers and analysts:
                    - Troubleshoot incidents and analyze logs
                    - Extract insights from tabular data and CSV sheets
                    - Analyze documents, PDFs, and report summaries
                    - Suggest fixes and explain root causes
                    """
                },
                {
                    "role": "user",
                    "content": question
                }
            ]
        )
        return {
            "answer": response.choices[0].message.content
        }
    except Exception as e:
        return {
            "error": str(e)
        }

# ==========================================
# SECURE LOG UPLOAD + INDEXING
# ==========================================

@app.post("/upload-log")
async def upload_log(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        os.makedirs("uploads", exist_ok=True)
        content = await file.read()
        filepath = f"uploads/{file.filename}"

        with open(filepath, "wb") as f:
            f.write(content)

        # Triggers universal indexing scoped to the logged-in user
        add_log("", file.filename, user_id=current_user["id"])

        return {
            "message": "File uploaded and indexed successfully",
            "filename": file.filename
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "error": str(e)
        }

# ==========================================
# LOG ANALYSIS (DIRECT)
# ==========================================

@app.get("/analyze-log")
def analyze_log(filename: str, current_user: dict = Depends(get_current_user)):
    try:
        filepath = f"uploads/{filename}"
        logs = read_logs(filepath)
        doc_type = classify_document(filename, logs)

        if doc_type == "log":
            system_prompt = "You are a Senior Site Reliability Engineer. Analyze logs and provide: Root Cause, Severity, Impact, Recommended Fix."
        elif doc_type == "tabular":
            system_prompt = "You are a Senior Data Analyst. Analyze this table/CSV and provide: Core Summary, Priority/Severity, Impact, Actions."
        else:
            system_prompt = "You are an Expert Document Analyst. Analyze this text/PDF and provide: Main Thesis, Urgency, Implications, Recommended Actions."

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": logs
                }
            ]
        )
        return {
            "analysis": response.choices[0].message.content
        }
    except Exception as e:
        return {
            "error": str(e)
        }

# ==========================================
# SEARCH HISTORICAL INCIDENTS (SCOPED)
# ==========================================

@app.get("/search-incidents")
def search_incidents(query: str, current_user: dict = Depends(get_current_user)):
    try:
        results = search_logs(query, user_id=current_user["id"])
        return {
            "query": query,
            "ids": results["ids"],
            "distances": results["distances"]
        }
    except Exception as e:
        return {
            "error": str(e)
        }

# ==========================================
# HELPERS
# ==========================================

def calculate_confidence(distance):
    if distance <= 0.20:
        return 98
    elif distance <= 0.50:
        return 95
    elif distance <= 0.80:
        return 90
    elif distance <= 1.00:
        return 85
    elif distance <= 1.20:
        return 80
    elif distance <= 1.50:
        return 70
    return 60

def normalize_severity(level):
    if not level:
        return "Medium"
    level = str(level).strip().lower()
    mapping = {
        "critical": "Critical",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
    }
    return mapping.get(level, "Medium")

def severity_score(level):
    scores = {
        "Critical": 95,
        "High": 80,
        "Medium": 60,
        "Low": 30
    }
    return scores.get(level, 60)

def extract_json(text):
    try:
        return json.loads(text)
    except Exception:
        match = re.search(
            r"\{.*\}",
            text,
            re.DOTALL
        )
        if match:
            return json.loads(match.group())
        raise ValueError(
            "Could not parse AI JSON response: " + text[:200]
        )

def validate_log_dates(evidence):
    warnings = []
    today = datetime.utcnow()
    for line in evidence:
        match = re.search(
            r"\d{4}-\d{2}-\d{2}",
            line
        )
        if match:
            try:
                log_date = datetime.strptime(
                    match.group(),
                    "%Y-%m-%d"
                )
                if log_date > today + timedelta(days=7):
                    warnings.append(
                        f"Future timestamp detected: {match.group()}"
                    )
            except Exception:
                pass
    return warnings

def classify_document(filename, content):
    _, ext = os.path.splitext(filename.lower())
    
    if ext in [".log"] or "log" in filename.lower() or "incident" in filename.lower() or "error" in filename.lower():
        return "log"
    elif ext == ".csv":
        return "tabular"
    elif ext == ".json":
        return "json"
    elif ext == ".pdf":
        return "pdf"
    
    content_lower = content.lower()
    if "error" in content_lower or "exception" in content_lower or "traceback" in content_lower:
        return "log"
    
    return "text"

# ==========================================
# SECURE AI INVESTIGATION (RAG VIA LANGGRAPH)
# ==========================================

@app.get("/investigate")
def investigate(query: str, current_user: dict = Depends(get_current_user)): 
    try:
        current_logs = ""
        filepath = f"uploads/{query}"
        if os.path.exists(filepath):
            current_logs = read_logs(filepath)

        # Scoped search
        results = search_logs(query, user_id=current_user["id"])
        
        has_matches = True
        if (
            not results
            or "documents" not in results
            or not results["documents"]
            or not results["documents"][0]
        ):
            has_matches = False

        if has_matches:
            ids = results.get("ids", [[]])[0]
            docs = results.get("documents", [[]])[0]
            distances = results.get("distances", [[]])[0]

            best_match = None
            best_distance = None

            for idx, incident_id in enumerate(ids):
                if incident_id != query:
                    best_match = incident_id
                    best_distance = distances[idx]
                    break

            if best_match is None:
                best_match = ids[0] if ids else "None"
                best_distance = distances[0] if distances else 1.0

            confidence_score = calculate_confidence(best_distance)
            matches_found = len(ids)
            context = "\n\n".join(docs)
            top_matches = [
                {
                    "incident": incident_id,
                    "distance": round(distance, 4),
                    "confidence": calculate_confidence(distance)
                }
                for incident_id, distance in zip(ids[:5], distances[:5])
            ]
        else:
            best_match = "None"
            best_distance = 1.0
            confidence_score = 100
            matches_found = 0
            context = "No historical matching documents available."
            top_matches = []

        # Run the Multi-Agent LangGraph Workflow instead of the raw Groq Client
        investigation = run_agent_analysis(
            query=query,
            content=current_logs if current_logs else query,
            best_match=best_match,
            context=context
        )

        # If investigation failed/returned raw text, parse it
        if isinstance(investigation, str):
            investigation = extract_json(investigation)

        severity_level = normalize_severity(
            investigation.get("severity", "Medium")
        )

        warnings = validate_log_dates(
            investigation.get("evidence", [])
        )

        return {
            "generated_at": datetime.utcnow().isoformat(),
            "query": query,
            "similar_incident": best_match,
            "historical_matches_found": matches_found,
            "confidence_score": confidence_score,
            "top_matches": top_matches,
            "retrieval_metadata": {
                "query_log": query,
                "current_log_loaded": bool(current_logs),
                "top_distance": round(best_distance, 4),
                "documents_retrieved": matches_found,
                "vector_database": "ChromaDB",
                "llm": "llama-3.3-70b-versatile"
            },
            "warnings": warnings,
            "investigation": {
                "root_cause": investigation.get("root_cause", ""),
                "evidence": investigation.get("evidence", []),
                "severity": {
                    "level": severity_level,
                    "score": severity_score(severity_level)
                },
                "impact": investigation.get("impact", []),
                "recommended_fix": investigation.get("recommended_fix", []),
                "prevention_strategy": investigation.get("prevention_strategy", [])
            }
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "error": str(e)
        }

# ==========================================
# SECURE DASHBOARD & STATS (SCOPED)
# ==========================================    

@app.get("/analytics")
def analytics(current_user: dict = Depends(get_current_user)):
    try:
        total = get_total_incidents(user_id=current_user["id"])
        return {
            "critical": max(0, int(total * 0.2)),
            "high": max(1, int(total * 0.4)),
            "medium": max(0, int(total * 0.3)),
            "low": max(0, int(total * 0.1))
        }
    except Exception:
        return {
            "critical": 1,
            "high": 3,
            "medium": 1,
            "low": 0
        }

@app.get("/incident-report")
def incident_report(query: str, current_user: dict = Depends(get_current_user)):
    try:
        data = investigate(query, current_user=current_user)
        if "error" in data:
            return PlainTextResponse(f"Error generating report: {data['error']}", status_code=400)
            
        inv = data["investigation"]
        doc_type = classify_document(query, data.get("retrieval_metadata", {}).get("query_log", ""))
        
        title = "RCA Incident Analysis Report"
        summary_label = "Incident Root Cause"
        evidence_label = "Log Evidence"
        severity_label = "Severity Level"
        impact_label = "Downstream Impact"
        fix_label = "Recommended Fixes"
        prevention_label = "Long-Term Prevention Strategy"
        
        if doc_type == "tabular":
            title = "Tabular Data Analysis Report"
            summary_label = "Core Findings Summary"
            evidence_label = "Supporting Data & Anomalies"
            severity_label = "Priority / Importance Level"
            impact_label = "Business Implications"
            fix_label = "Strategic Recommendations"
            prevention_label = "Data Integrity & Monitoring Rules"
        elif doc_type == "text" or doc_type == "pdf":
            title = "Document Summary & Insights Report"
            summary_label = "Core Thesis / Summary"
            evidence_label = "Key Supporting Claims"
            severity_label = "Urgency / Significance Level"
            impact_label = "Implications & Key Takeaways"
            fix_label = "Recommended Tasks & Actions"
            prevention_label = "Long-Term Strategy & References"
            
        evidence_str = "\n".join([f"- {item}" for item in inv.get("evidence", [])]) if inv.get("evidence") else "*No specific evidence listed.*"
        impact_str = "\n".join([f"- {item}" for item in inv.get("impact", [])]) if inv.get("impact") else "*No direct impact elements listed.*"
        fix_str = "\n".join([f"- {item}" for item in inv.get("recommended_fix", [])]) if inv.get("recommended_fix") else "*No recommendations proposed.*"
        prevention_str = "\n".join([f"- {item}" for item in inv.get("prevention_strategy", [])]) if inv.get("prevention_strategy") else "*No prevention strategies specified.*"

        report_md = f"""# {title}
Generated At: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")} UTC
Target Document: {query}
Confidence Score: {data["confidence_score"]}%
Similar Comparison: {data.get("similar_incident", "None")}

---

## 📌 {summary_label}
{inv.get("root_cause", "N/A")}

---

## 📊 {severity_label}
**Level**: {inv.get("severity", {}).get("level", "Medium")}
**Score**: {inv.get("severity", {}).get("score", 60)}/100

---

## 🔍 {evidence_label}
{evidence_str}

---

## 💥 {impact_label}
{impact_str}

---

## 🛠️ {fix_label}
{fix_str}

---

## 🛡️ {prevention_label}
{prevention_str}

---
*Report generated by AI Copilot Engine via Multi-Agent Workflow.*
"""
        
        safe_filename = re.sub(r"[^\w\-.]", "_", query)
        headers = {
            "Content-Disposition": f'attachment; filename="{safe_filename.replace(".", "_")}_analysis.md"'
        }
        return PlainTextResponse(report_md, media_type="text/markdown", headers=headers)
        
    except Exception as e:
        traceback.print_exc()
        return PlainTextResponse(f"Error generating report: {str(e)}", status_code=500)
    
@app.get("/stats")
def stats(current_user: dict = Depends(get_current_user)):
    try:
        total_incidents = get_total_incidents(user_id=current_user["id"])
        critical = max(0, int(total_incidents * 0.15))
        high = max(0, int(total_incidents * 0.35))
        medium = max(0, int(total_incidents * 0.4))
        low = total_incidents - (critical + high + medium)
        return {
            "total_incidents": total_incidents,
            "critical": max(0, critical),
            "high": max(0, high),
            "medium": max(0, medium),
            "low": max(0, low)
        }
    except Exception as e:
        return {
            "error": str(e)
        }
    
@app.get("/recent-incidents")
def recent_incidents(current_user: dict = Depends(get_current_user)):
    try:
        ids = get_recent_incidents(10, user_id=current_user["id"])
        return {
            "incidents": ids
        }
    except Exception as e:
        return {
            "error": str(e)
        }
    
@app.get("/dashboard")
def dashboard(current_user: dict = Depends(get_current_user)):
    try:
        total = get_total_incidents(user_id=current_user["id"])
        critical = max(0, int(total * 0.15))
        high = max(0, int(total * 0.35))
        medium = max(0, int(total * 0.4))
        low = total - (critical + high + medium)
        return {
            "total_incidents": total,
            "critical": max(0, critical),
            "high": max(0, high),
            "medium": max(0, medium),
            "low": max(0, low)
        }
    except Exception:
        return {
            "total_incidents": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        }

@app.get("/chatops")
def chatops(question: str, current_user: dict = Depends(get_current_user)):
    try:
        # Search queries are isolated to current user
        results = search_logs(question, user_id=current_user["id"])
        has_matches = True
        if (
            not results
            or "documents" not in results
            or not results["documents"]
            or not results["documents"][0]
        ):
            has_matches = False

        if has_matches:
            context = "\n\n".join(results["documents"][0])
            system_prompt = """
You are a Universal AI Copilot Assistant.
Answer questions using the provided context logs and documents when available.
Be concise, accurate, and use evidence directly from the context.
"""
            user_prompt = f"""
Question:
{question}

Context Logs & Documents:
{context}
"""
        else:
            system_prompt = """
You are a Universal AI Copilot Assistant.
Answer the user's question directly since no specific database context was matched.
Be concise, precise, and helpful.
"""
            user_prompt = f"""
Question:
{question}
"""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        )

        return {
            "answer": response.choices[0].message.content
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "error": str(e)
        }
    
@app.get("/groq-test")
def groq_test():
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": "hello"
            }
        ]
    )
    return {
        "response": response.choices[0].message.content
    }

@app.get("/timeline")
def timeline(logfile: str, current_user: dict = Depends(get_current_user)):
    try:
        filepath = f"uploads/{logfile}"
        if not os.path.exists(filepath):
            return {
                "error": "Log file not found"
            }

        chunks = parse_file_to_chunks(filepath)
        events = [c["content"] for c in chunks]

        return {
            "logfile": logfile,
            "events": events
        }
    except Exception as e:
        return {
            "error": str(e)
        }

from fastapi.staticfiles import StaticFiles

# Serve built frontend assets in production container
dist_path = Path(__file__).parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="frontend")