import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const response = await API.post("/auth/register", {
          username,
          email,
          password
        });
        if (response.data.error) {
          setError(response.data.error);
        } else {
          setIsRegister(false);
          setPassword("");
          setError("");
          alert("Registration successful! Please login.");
        }
      } else {
        const response = await API.post("/auth/login", {
          username,
          password
        });
        if (response.data.error) {
          setError(response.data.error);
        } else {
          const { access_token, username: loggedInUsername } = response.data;
          localStorage.setItem("token", access_token);
          localStorage.setItem("username", loggedInUsername);
          navigate("/");
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-md w-full bg-slate-800/40 border border-slate-700/50 rounded-3xl shadow-2xl p-8 backdrop-blur-xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Decorative subtle backdrop glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center">
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent mb-2">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-slate-400 text-sm">
            {isRegister
              ? "Sign up to start troubleshooting incidents with Copilot AI"
              : "Login to access your personal operations dashboard"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-4 flex gap-2 animate-pulse">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Username</label>
            <input
              type="text"
              required
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            />
          </div>

          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <input
              type="password"
              required
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-6 rounded-xl font-bold mt-4 transition-all duration-300 flex items-center justify-center gap-2 ${
              loading
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 hover:opacity-90 text-white shadow-xl shadow-indigo-500/20"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : isRegister ? (
              "Sign Up"
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          {isRegister ? "Already have an account?" : "Don't have an account yet?"}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4"
          >
            {isRegister ? "Log In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
