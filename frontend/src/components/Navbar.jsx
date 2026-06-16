import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const navLinks = [
    { name: "Dashboard", path: "/" },
    { name: "Upload Data", path: "/upload" },
    { name: "Investigation", path: "/investigate" },
    { name: "ChatOps", path: "/chatops" },
    { name: "History", path: "/history" }
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/90 text-white border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚀</span>
        <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
          COPILOT AI
        </span>
      </div>
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
    </nav>
  );
}