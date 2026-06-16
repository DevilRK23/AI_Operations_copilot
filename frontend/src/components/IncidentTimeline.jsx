export default function IncidentTimeline() {

  const timeline = [
    "Database Connection Refused",
    "User Data Fetch Failed",
    "API Response 500",
    "Service Degraded"
  ];

  return (

    <div className="bg-white p-6 rounded-xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Incident Timeline
      </h2>

      {timeline.map((event, index) => (

        <div
          key={index}
          className="border-l-4 border-blue-500 pl-4 mb-4"
        >
          {event}
        </div>

      ))}

    </div>
  );
}