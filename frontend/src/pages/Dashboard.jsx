import { useEffect, useState } from "react";
import API from "../services/api";
import IncidentTrendChart from "../components/IncidentTrendChart";
import RecentIncidents from "../components/RecentIncidents";
import SeverityChart from "../components/SeverityChart";
import LiveIncidentFeed from "../components/LiveIncidentFeed";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_incidents: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await API.get("/stats");
        setStats(response.data);
      } catch (err) {
        console.error("Error loading stats:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          🚀 AI Operations Copilot
        </h1>
        <p className="text-slate-400 mb-8 text-sm">
          AI-powered log parsing, dynamic tabular data analytics, and vector-similarity root cause analysis.
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Indexed</h3>
            <h2 className="text-4xl font-extrabold text-slate-100 mt-2">
              {stats.total_incidents}
            </h2>
          </div>

          <div className="bg-red-950/40 border border-red-500/20 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400">Critical Priority</h3>
            <h2 className="text-4xl font-extrabold text-red-450 mt-2">
              {stats.critical}
            </h2>
          </div>

          <div className="bg-orange-950/40 border border-orange-500/20 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-400">High Priority</h3>
            <h2 className="text-4xl font-extrabold text-orange-450 mt-2">
              {stats.high}
            </h2>
          </div>

          <div className="bg-yellow-950/40 border border-yellow-500/20 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-yellow-400">Medium Priority</h3>
            <h2 className="text-4xl font-extrabold text-yellow-450 mt-2">
              {stats.medium}
            </h2>
          </div>

          <div className="bg-green-950/40 border border-green-500/20 p-6 rounded-2xl shadow-lg col-span-2 md:col-span-1 flex flex-col justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-400">Low Priority</h3>
            <h2 className="text-4xl font-extrabold text-green-450 mt-2">
              {stats.low}
            </h2>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <IncidentTrendChart />
          </div>
          <div className="md:col-span-1">
            <SeverityChart stats={stats} />
          </div>
        </div>

        {/* Lists Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecentIncidents />
          <LiveIncidentFeed />
        </div>
      </div>
    </div>
  );
}