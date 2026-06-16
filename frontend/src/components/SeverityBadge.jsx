export default function SeverityBadge({ level }) {

  const styles = {
    Critical: "bg-red-600",
    High: "bg-orange-500",
    Medium: "bg-yellow-500",
    Low: "bg-green-500",
  };

  return (
    <span
      className={`px-3 py-1 rounded text-white ${styles[level]}`}
    >
      {level}
    </span>
  );
}