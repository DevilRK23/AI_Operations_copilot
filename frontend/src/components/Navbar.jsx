import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  
  const [apiKey, setApiKey] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);

  const navLinks = [
    { name: "Dashboard", path: "/" },
    { name: "Upload Data", path: "/upload" },
    { name: "Investigation", path: "/investigate" },
    { name: "ChatOps", path: "/chatops" },
    { name: "History", path: "/history" }
  ];

  // Fetch API key when requested
  const fetchApiKey = async () => {
    setLoadingKey(true);
    try {
      const res = await API.get("/auth/me");
      setApiKey(res.data.api_key || "No key generated. Click below to generate one.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKey(false);
    }
  };

  const handleGenerateKey = async () => {
    setLoadingKey(true);
    try {
      const res = await API.post("/auth/api-key");
      setApiKey(res.data.api_key);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKey(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
    window.location.reload();
  };

  // If not logged in, do not render navigation bar
  if (!token) return null;

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/90 text-white border-b border-slate-800/80 px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            COPILOT AI
          </span>
        </div>
        
        {/* Navigation links */}
        <div className="flex items-center gap-4">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold transition-all duration-200 px-4 py-2 rounded-lg ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* User context menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowKeyModal(true);
              fetchApiKey();
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200 flex items-center gap-1"
          >
            🔑 API Key
          </button>
          
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs text-slate-300 font-medium">
              {username || "User"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-950/20 border border-red-950 hover:bg-red-900/20 transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">
              Public API Access Key
            </h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Use this key in external HTTP requests by attaching it as the <code>X-API-Key</code> header to query the Copilot API programmatically.
            </p>

            <div className="flex flex-col gap-3">
              <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 break-all select-all border border-slate-700">
                {loadingKey ? "Loading key..." : apiKey}
              </div>
              
              <div className="flex justify-between gap-3 mt-2">
                <button
                  onClick={handleGenerateKey}
                  disabled={loadingKey}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-all duration-200"
                >
                  Regenerate Key
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    alert("Copied to clipboard!");
                  }}
                  disabled={!apiKey || loadingKey}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition-all duration-200"
                >
                  Copy Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}