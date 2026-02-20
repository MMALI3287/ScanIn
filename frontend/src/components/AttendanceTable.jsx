export default function AttendanceTable({ records, onEdit }) {
  if (!records || records.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No attendance records found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <th className="p-3">Name</th>
            <th className="p-3">Date</th>
            <th className="p-3">Check-in</th>
            <th className="p-3">Check-out</th>
            <th className="p-3">Status</th>
            {onEdit && <th className="p-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-t hover:bg-gray-50">
              <td className="p-3">{r.trainee_name}</td>
              <td className="p-3">{r.date}</td>
              <td className="p-3">
                {r.checkin_time
                  ? new Date(r.checkin_time).toLocaleTimeString()
                  : "—"}
              </td>
              <td className="p-3">
                {r.checkout_time
                  ? new Date(r.checkout_time).toLocaleTimeString()
                  : "—"}
              </td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    r.status === "present"
                      ? "bg-green-100 text-green-700"
                      : r.status === "late"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {r.status}
                </span>
              </td>
              {onEdit && (
                <td className="p-3">
                  <button
                    onClick={() => onEdit(r)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
