import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function RecentIncidents() {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await API.get("/recent-incidents");
        setIncidents(response.data.incidents || []);
      } catch (err) {
        console.error("Error loading recent incidents:", err);
      }
    };
    fetchIncidents();
  }, []);

  const getBadgeStyle = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === "csv") return "bg-emerald-500/15 text-emerald-450 border border-emerald-500/20";
    if (ext === "pdf") return "bg-red-500/15 text-red-450 border border-red-500/20";
    if (ext === "json") return "bg-amber-500/15 text-amber-450 border border-amber-500/20";
    if (ext === "log") return "bg-sky-500/15 text-sky-450 border border-sky-500/20";
    return "bg-slate-500/15 text-slate-450 border border-slate-500/20";
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-slate-200">
        📂 Recent Data Uploads
      </h2>

      <div className="space-y-3">
        {incidents.slice(0, 5).map((incident, index) => {
          const ext = incident.split('.').pop()?.toUpperCase() || "TXT";
          return (
            <div
              key={index}
              onClick={() => navigate("/investigate", { state: { query: incident } })}
              className="flex items-center justify-between bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl transition-all duration-150 cursor-pointer"
            >
              <span className="font-semibold text-sm text-slate-300 truncate pr-4">
                {incident}
              </span>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${getBadgeStyle(incident)}`}>
                {ext}
              </span>
            </div>
          );
        })}
        
        {incidents.length === 0 && (
          <div className="text-sm text-slate-500 italic py-4">No documents indexed yet.</div>
        )}
      </div>
    </div>
  );
}