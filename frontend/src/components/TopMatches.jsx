export default function TopMatches({ matches }) {
  if (!matches || matches.length === 0) return null;

  return (
    <div className="bg-slate-850 p-6 rounded-2xl border border-slate-700/50 shadow-md">
      <h2 className="text-lg font-bold mb-4 text-slate-200">
        📚 Closest Historical Matches (Vector Search)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((item, index) => (
          <div
            key={index}
            className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between"
          >
            <div className="truncate pr-4">
              <p className="font-semibold text-slate-300 text-sm truncate">
                {item.incident}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Distance: {item.distance}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                {item.confidence}% match
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}