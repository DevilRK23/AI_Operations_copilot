import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function SeverityChart({ stats }) {
  const data = [
    { name: "Critical", value: stats?.critical || 0 },
    { name: "High", value: stats?.high || 0 },
    { name: "Medium", value: stats?.medium || 0 },
    { name: "Low", value: stats?.low || 0 }
  ];

  const COLORS = [
    "#ef4444", // Critical - Red
    "#f97316", // High - Orange
    "#eab308", // Medium - Yellow
    "#22c55e"  // Low - Green
  ];

  const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-2xl shadow-lg flex flex-col h-full justify-between">
      <h2 className="text-xl font-bold mb-4 text-slate-200">
        📊 Priority Distribution
      </h2>

      {totalValue === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16">
          <span className="text-3xl mb-2">📊</span>
          <p className="text-sm italic">No data indexed yet</p>
        </div>
      ) : (
        <div className="w-full flex-1 flex items-center justify-center" style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#1e293b"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#f1f5f9"
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-slate-450 font-semibold">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}