import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function LiveIncidentFeed() {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await API.get("/recent-incidents");
        setIncidents(response.data.incidents || []);
      } catch (err) {
        console.error("Error loading live feed:", err);
      }
    };
    fetchIncidents();
  }, []);

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
          📡 Live Activity Stream
        </h2>
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-800 text-slate-400 text-xs">
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>Live updates</span>
        </div>
      </div>

      <div className="space-y-4">
        {incidents.slice(0, 4).map((incident, index) => {
          const timestamp = new Date(Date.now() - index * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <div
              key={index}
              onClick={() => navigate("/investigate", { state: { query: incident } })}
              className="flex gap-4 items-start hover:bg-slate-900/30 p-2 rounded-xl transition-all duration-150 cursor-pointer"
            >
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold text-slate-500 font-mono">{timestamp}</span>
                <div className="h-full w-0.5 bg-slate-700 my-1"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  Ingested & Vectorized File
                </p>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                  {incident}
                </p>
              </div>
              <span className="text-emerald-400 text-sm">✔ Indexed</span>
            </div>
          );
        })}

        {incidents.length === 0 && (
          <div className="text-sm text-slate-500 italic py-4">No incoming stream activity.</div>
        )}
      </div>
    </div>
  );
}