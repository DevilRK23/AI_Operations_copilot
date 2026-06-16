import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import API from "../services/api";
import SeverityBadge from "../components/SeverityBadge";
import TopMatches from "../components/TopMatches";

export default function Investigate() {
  const location = useLocation();
  const [query, setQuery] = useState(location.state?.query || "");
  const [fileList, setFileList] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFileList = async () => {
      try {
        const response = await API.get("/recent-incidents");
        setFileList(response.data.incidents || []);
      } catch (err) {
        console.error("Error fetching recent files:", err);
      }
    };
    fetchFileList();
  }, []);

  useEffect(() => {
    if (location.state?.query) {
      setQuery(location.state.query);
      const autoInvestigate = async () => {
        setLoading(true);
        setError("");
        setResult(null);
        try {
          const response = await API.get(`/investigate?query=${location.state.query}`);
          if (response.data.error) {
            setError(response.data.error);
          } else {
            setResult(response.data);
          }
        } catch (err) {
          setError(err.response?.data?.error || "An error occurred during analysis.");
        } finally {
          setLoading(false);
        }
      };
      autoInvestigate();
    }
  }, [location.state]);

  const investigate = async () => {
    if (!query) {
      setError("Please select or type a filename first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await API.get(`/investigate?query=${query}`);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setResult(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob(
      [JSON.stringify(result, null, 2)],
      { type: "application/json" }
    );
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${query.replace(/\.[^/.]+$/, "")}_analysis.json`;
    a.click();
  };

  // Helper to determine dynamic labels based on document format
  const getLabels = () => {
    const ext = query.split('.').pop()?.toLowerCase();
    if (ext === "csv") {
      return {
        title: "Tabular Data Analysis",
        rootCause: "Synthesized Core Findings",
        evidence: "Key Data Rows & Anomalies",
        severity: "Priority / Importance Level",
        impact: "Downstream / Business Impact",
        fix: "Strategic Recommendations & Insights",
        prevention: "Continuous Monitoring & Auditing rules"
      };
    } else if (ext === "pdf" || ext === "txt" || ext === "md") {
      return {
        title: "Document Insight Analysis",
        rootCause: "Core Summary / Main Thesis",
        evidence: "Supporting Quotes & Key Facts",
        severity: "Urgency / Significance Level",
        impact: "Implications & Key Takeaways",
        fix: "Recommended Tasks & Actions",
        prevention: "Long-term Strategy & References"
      };
    }
    return {
      title: "Incident Investigation (RAG)",
      rootCause: "Root Cause",
      evidence: "Log Evidence",
      severity: "Severity",
      impact: "Incident Impact",
      fix: "Recommended Fix",
      prevention: "Prevention Strategy"
    };
  };

  const labels = getLabels();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Copilot Data & Logs Investigator
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          Select an uploaded file to trigger vector-based comparison and contextual LLM synthesis.
        </p>

        {/* Input & Control Panel */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl shadow-xl p-6 backdrop-blur-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">Select Uploaded File</label>
              <select
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError("");
                }}
                className="border border-slate-700 p-3 rounded-xl w-full bg-slate-900 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a file --</option>
                {fileList.map((file, idx) => (
                  <option key={idx} value={file}>{file}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">Or Type Filename Manually</label>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError("");
                }}
                placeholder="e.g. database_failure.log, payment.csv"
                className="border border-slate-700 p-3 rounded-xl w-full bg-slate-900 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-between items-center">
            <button
              onClick={investigate}
              disabled={loading}
              className={`flex-1 min-w-[150px] py-3 px-6 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                loading
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running RAG Analytics...
                </>
              ) : (
                <>🔍 Analyze Document</>
              )}
            </button>

            {result && (
              <div className="flex gap-4">
                <button
                  className="py-3 px-5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-200"
                  onClick={() =>
                    window.open(`http://127.0.0.1:8000/incident-report?query=${query}`)
                  }
                >
                  📄 Download Report
                </button>
                <button
                  onClick={downloadJSON}
                  className="py-3 px-5 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all duration-200"
                >
                  📥 Export Raw JSON
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-4 flex gap-2 mb-8">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Results Panels */}
        {result && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold border-b border-slate-800 pb-3 text-slate-200 flex items-center justify-between">
              <span>📊 {labels.title} Summary</span>
              <div className="flex items-center gap-3 text-sm font-normal text-slate-400">
                <span>Confidence: <strong>{result.confidence_score}%</strong></span>
                <span>Matches: <strong>{result.historical_matches_found}</strong></span>
              </div>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Summary Metadata Panel */}
              <div className="bg-slate-800/60 border border-slate-700/40 p-6 rounded-2xl shadow-lg md:col-span-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Target Document</h3>
                  <div className="font-bold text-lg text-slate-200 truncate mb-4">{result.query}</div>
                  
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Closest Comparative Vector</h3>
                  <div className="text-sm text-slate-300 font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-800 truncate mb-4">
                    {result.similar_incident || "N/A"}
                  </div>

                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{labels.severity}</h3>
                  <div className="mt-1">
                    <SeverityBadge level={result.investigation.severity.level} />
                  </div>
                </div>

                <div className="mt-8 text-xs text-slate-500 border-t border-slate-700/40 pt-4">
                  Analyzed at: {new Date(result.generated_at).toLocaleString()}
                </div>
              </div>

              {/* Primary Summary Content */}
              <div className="bg-slate-800/60 border border-slate-700/40 p-6 rounded-2xl shadow-lg md:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{labels.rootCause}</h3>
                <p className="text-slate-200 text-base leading-relaxed bg-slate-900/30 p-4 rounded-xl border border-slate-850">
                  {result.investigation.root_cause}
                </p>
              </div>
            </div>

            {/* In-Depth Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Evidence */}
              <div className="bg-slate-800/60 border border-slate-700/40 p-6 rounded-2xl shadow-lg">
                <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700/30 pb-2 mb-4">
                  🔍 {labels.evidence}
                </h3>
                <ul className="space-y-3">
                  {result.investigation.evidence.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-350 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40 font-mono">
                      {item}
                    </li>
                  ))}
                  {result.investigation.evidence.length === 0 && (
                    <div className="text-sm text-slate-500 italic">No evidence items listed.</div>
                  )}
                </ul>
              </div>

              {/* Impact */}
              <div className="bg-slate-800/60 border border-slate-700/40 p-6 rounded-2xl shadow-lg">
                <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700/30 pb-2 mb-4">
                  💥 {labels.impact}
                </h3>
                <ul className="space-y-3">
                  {result.investigation.impact.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-350 flex gap-2">
                      <span className="text-indigo-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {result.investigation.impact.length === 0 && (
                    <div className="text-sm text-slate-500 italic">No direct impact elements specified.</div>
                  )}
                </ul>
              </div>

              {/* Actions / Fixes */}
              <div className="bg-slate-800/60 border border-slate-700/40 p-6 rounded-2xl shadow-lg">
                <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700/30 pb-2 mb-4">
                  🛠️ {labels.fix}
                </h3>
                <ul className="space-y-3">
                  {result.investigation.recommended_fix.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-350 flex gap-2">
                      <span className="text-blue-400">⚡</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {result.investigation.recommended_fix.length === 0 && (
                    <div className="text-sm text-slate-500 italic">No direct fixes proposed.</div>
                  )}
                </ul>
              </div>

              {/* Prevention Strategy */}
              <div className="bg-slate-800/60 border border-slate-700/40 p-6 rounded-2xl shadow-lg">
                <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700/30 pb-2 mb-4">
                  🛡️ {labels.prevention}
                </h3>
                <ul className="space-y-3">
                  {result.investigation.prevention_strategy.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-350 flex gap-2">
                      <span className="text-emerald-400">✔</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {result.investigation.prevention_strategy.length === 0 && (
                    <div className="text-sm text-slate-500 italic">No specific strategy proposed.</div>
                  )}
                </ul>
              </div>
            </div>

            {/* Comparable Matches list */}
            {result.top_matches && result.top_matches.length > 0 && (
              <div className="mt-8 bg-slate-800/40 border border-slate-700/30 rounded-2xl p-6">
                <TopMatches matches={result.top_matches} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}