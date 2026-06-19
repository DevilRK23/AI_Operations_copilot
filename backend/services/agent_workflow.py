import os
import json
import re
from pathlib import Path
from typing import Dict, Any, List, TypedDict
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from groq import Groq

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)


class AgentState(TypedDict):
    query: str
    content: str
    doc_type: str
    best_match: str
    context: str
    raw_analysis: str
    feedback: str
    iterations: int
    final_output: Dict[str, Any]

def get_llm_response(system_prompt: str, user_prompt: str) -> str:
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    )
    return response.choices[0].message.content.strip()

def router_node(state: AgentState) -> Dict[str, Any]:
    query = state["query"]
    content = state["content"]
    _, ext = os.path.splitext(query.lower())
    
    if ext in [".log"] or "log" in query.lower() or "incident" in query.lower() or "error" in query.lower():
        doc_type = "log"
    elif ext == ".csv":
        doc_type = "tabular"
    elif ext == ".json":
        doc_type = "json"
    elif ext == ".pdf":
        doc_type = "pdf"
    else:
        content_lower = content.lower()
        if "error" in content_lower or "exception" in content_lower or "traceback" in content_lower:
            doc_type = "log"
        else:
            doc_type = "text"
            
    return {"doc_type": doc_type, "iterations": 0}

def analyst_node(state: AgentState) -> Dict[str, Any]:
    doc_type = state["doc_type"]
    query = state["query"]
    content = state["content"]
    best_match = state["best_match"]
    context = state["context"]
    
    if doc_type == "log":
        system_prompt = """
You are an Expert Site Reliability Engineer (SRE).
Analyze the CURRENT INCIDENT LOG. Historical logs are provided only as supporting context.
Return a valid JSON object summarizing the incident investigation:
{
  "root_cause": "Detailed analysis of what triggered the incident",
  "evidence": ["Log line or pattern showing the error", "Additional log evidence"],
  "severity": "Critical / High / Medium / Low",
  "impact": ["Description of affected services, performance, or users"],
  "recommended_fix": ["Step-by-step resolution or configuration fix"],
  "prevention_strategy": ["Monitoring rules, circuit breakers, or scaling configs to prevent recurrence"]
}
Ensure output is ONLY the JSON object, with no conversational prefix or suffix.
"""
        user_prompt = f"""
Current Incident: {query}
Current Incident Logs:
{content}

Most Similar Incident: {best_match}
Historical Incident Logs:
{context}
"""
    elif doc_type == "tabular":
        system_prompt = """
You are an Expert Data Analyst.
Analyze the CURRENT DATASET. Historical datasets or tables are provided only as supporting context.
Return a valid JSON object summarizing the data analysis:
{
  "root_cause": "A high-level synthesis of key findings, major patterns, or data anomalies identified",
  "evidence": ["Specific data rows, statistics, values, or anomalies supporting the findings"],
  "severity": "Critical / High / Medium / Low",
  "impact": ["Operational or business implications of these data trends"],
  "recommended_fix": ["Actionable insights or strategic recommendations based on the data"],
  "prevention_strategy": ["Continuous monitoring metrics, data validation checks, or future dashboard adjustments"]
}
Ensure output is ONLY the JSON object, with no conversational prefix or suffix.
"""
        user_prompt = f"""
Current Dataset: {query}
Current Data Content:
{content}

Most Similar Dataset: {best_match}
Historical Data Logs:
{context}
"""
    else:
        system_prompt = """
You are an Expert Document Analysis Assistant.
Analyze the CURRENT DOCUMENT text. Historical documents are provided only as supporting context.
Return a valid JSON object summarizing the document:
{
  "root_cause": "Main thesis, core summary, or primary topic of the document",
  "evidence": ["Key facts, quotes, sections, or claims made in the document"],
  "severity": "Critical / High / Medium / Low",
  "impact": ["The significance, key takeaways, or downstream implications of the document contents"],
  "recommended_fix": ["Actionable next steps, recommended tasks, or solutions suggested by the content"],
  "prevention_strategy": ["Long-term strategy, follow-up research questions, or reference checks"]
}
Ensure output is ONLY the JSON object, with no conversational prefix or suffix.
"""
        user_prompt = f"""
Current Document: {query}
Current Document Text:
{content}

Most Similar Document: {best_match}
Historical Documents:
{context}
"""

    raw_analysis = get_llm_response(system_prompt, user_prompt)
    return {"raw_analysis": raw_analysis}

def reviewer_node(state: AgentState) -> Dict[str, Any]:
    raw_analysis = state["raw_analysis"]
    
    try:
        data = None
        # Try raw json loads
        try:
            data = json.loads(raw_analysis)
        except Exception:
            # Look for JSON block in markdown
            match = re.search(r"\{.*\}", raw_analysis, re.DOTALL)
            if match:
                data = json.loads(match.group())
                
        if not data:
            raise ValueError("No JSON pattern matched in output.")
            
        required_keys = ["root_cause", "evidence", "severity", "impact", "recommended_fix", "prevention_strategy"]
        missing_keys = [k for k in required_keys if k not in data]
        
        if missing_keys:
            feedback = f"Missing required JSON fields: {missing_keys}"
            return {"feedback": feedback}
            
        severity = str(data.get("severity", "")).strip().lower()
        if severity not in ["critical", "high", "medium", "low"]:
            # Correct invalid severity automatically to avoid loop
            data["severity"] = "Medium"
            
        return {"final_output": data, "feedback": ""}
    except Exception as e:
        feedback = f"Response is not valid JSON. Error: {str(e)}. Raw content was: {raw_analysis[:300]}"
        return {"feedback": feedback}

def fix_node(state: AgentState) -> Dict[str, Any]:
    raw_analysis = state["raw_analysis"]
    feedback = state["feedback"]
    iterations = state["iterations"] + 1
    
    system_prompt = """
You are a JSON Correction Agent. Your job is to take a malformed or invalid analysis JSON, apply the feedback, and output a 100% correct, valid JSON object that strictly adheres to the requested schema.
Do NOT include any markdown formatting, explainers, or text outside the JSON. Only return the JSON object.
"""
    user_prompt = f"""
Previous Attempted JSON:
{raw_analysis}

Feedback / Errors:
{feedback}

Please output the corrected JSON matching the schema:
{{
  "root_cause": "...",
  "evidence": ["..."],
  "severity": "Critical / High / Medium / Low",
  "impact": ["..."],
  "recommended_fix": ["..."],
  "prevention_strategy": ["..."]
}}
"""
    raw_analysis = get_llm_response(system_prompt, user_prompt)
    return {"raw_analysis": raw_analysis, "iterations": iterations}

def should_continue(state: AgentState):
    if state.get("feedback") == "" or state.get("iterations", 0) >= 2:
        return "end"
    return "fix"

# Build LangGraph State Graph
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("analyst", analyst_node)
workflow.add_node("reviewer", reviewer_node)
workflow.add_node("fix", fix_node)

workflow.set_entry_point("router")
workflow.add_edge("router", "analyst")
workflow.add_edge("analyst", "reviewer")

workflow.add_conditional_edges(
    "reviewer",
    should_continue,
    {
        "fix": "fix",
        "end": END
    }
)
workflow.add_edge("fix", "reviewer")

app_graph = workflow.compile()

def run_agent_analysis(query: str, content: str, best_match: str, context: str) -> Dict[str, Any]:
    initial_state = {
        "query": query,
        "content": content,
        "best_match": best_match,
        "context": context,
        "raw_analysis": "",
        "feedback": "",
        "iterations": 0,
        "final_output": {}
    }
    result = app_graph.invoke(initial_state)
    return result.get("final_output") or result.get("raw_analysis")
