import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function History() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await API.get("/recent-incidents");
        setIncidents(response.data.incidents || []);
      } catch (err) {
        console.error("Error fetching history:", err);
        setError("Could not load historical records.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleInspect = (fileName) => {
    navigate("/investigate", { state: { query: fileName } });
  };

  const getBadgeStyle = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === "csv") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
    if (ext === "pdf") return "bg-red-500/10 text-red-400 border border-red-500/25";
    if (ext === "json") return "bg-amber-500/10 text-amber-400 border border-amber-500/25";
    if (ext === "log") return "bg-sky-500/10 text-sky-400 border border-sky-500/25";
    return "bg-slate-500/10 text-slate-400 border border-slate-500/25";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Historical Indexed Data
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          A list of all documents, logs, and datasets currently ingested and mapped inside the vector store.
        </p>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-4 flex gap-2 mb-6">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {!loading && incidents.length === 0 && (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-12 text-center">
            <span className="text-4xl mb-4 block">📁</span>
            <h3 className="text-lg font-bold text-slate-300 mb-1">No Indexed Files</h3>
            <p className="text-slate-500 text-sm mb-6">
              You haven't uploaded any documents or logs to the vector store yet.
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all duration-200"
            >
              Upload Your First File
            </button>
          </div>
        )}

        {!loading && incidents.length > 0 && (
          <div className="space-y-4">
            {incidents.map((incident, index) => {
              const ext = incident.split('.').pop()?.toUpperCase() || "TXT";
              return (
                <div
                  key={index}
                  className="bg-slate-800/80 border border-slate-700/50 p-5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-600 transition-colors duration-150"
                >
                  <div className="flex items-center gap-4 truncate">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold font-mono ${getBadgeStyle(incident)}`}>
                      {ext}
                    </span>
                    <h3 className="font-bold text-base text-slate-200 truncate" title={incident}>
                      {incident}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => handleInspect(incident)}
                      className="flex-1 sm:flex-none text-center bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-4.5 py-2 rounded-xl text-sm font-bold transition-all duration-150"
                    >
                      🔍 Run Analytics
                    </button>
                    <button
                      onClick={() =>
                        window.open(`http://127.0.0.1:8000/incident-report?query=${incident}`)
                      }
                      className="flex-1 sm:flex-none text-center bg-slate-700/60 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150"
                    >
                      📄 Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}