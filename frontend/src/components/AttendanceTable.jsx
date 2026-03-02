import { useState } from "react";
import { useDarkMode } from "../DarkModeContext";

export default function AttendanceTable({ records, onEdit }) {
  const { dark } = useDarkMode();
  const [previewImage, setPreviewImage] = useState(null);
  if (!records || records.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-12 h-12 mx-auto text-gray-700 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
          />
        </svg>
        <p className="text-gray-500">No attendance records found.</p>
      </div>
    );
  }

  const imgBase = "";

  return (
    <>
      <div className="overflow-x-auto">
        <table
          className={`w-full border-collapse ${dark ? "bg-gray-900" : "bg-white"} rounded-lg overflow-hidden`}
        >
          <thead>
            <tr
              className={`${dark ? "bg-gray-800" : "bg-gray-50"} text-left text-sm font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}
            >
              <th className="p-3">Name</th>
              <th className="p-3">Date</th>
              <th className="p-3">Check-in</th>
              <th className="p-3">Check-out</th>
              <th className="p-3">Status</th>
              <th className="p-3">Images</th>
              {onEdit && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                className={`${dark ? "border-t border-gray-800 hover:bg-gray-800/50" : "border-t border-gray-100 hover:bg-gray-50"}`}
              >
                <td
                  className={`p-3 font-medium ${dark ? "text-white" : "text-gray-900"}`}
                >
                  {r.trainee_name}
                </td>
                <td
                  className={`p-3 ${dark ? "text-gray-300" : "text-gray-600"}`}
                >
                  {r.date}
                </td>
                <td
                  className={`p-3 ${dark ? "text-gray-300" : "text-gray-600"}`}
                >
                  {r.checkin_time
                    ? new Date(r.checkin_time).toLocaleTimeString()
                    : "—"}
                </td>
                <td
                  className={`p-3 ${dark ? "text-gray-300" : "text-gray-600"}`}
                >
                  {r.checkout_time
                    ? new Date(r.checkout_time).toLocaleTimeString()
                    : "—"}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      r.status === "present"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : r.status === "late"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {r.checkin_image && (
                      <img
                        src={`${imgBase}${r.checkin_image}`}
                        alt="Check-in"
                        className={`w-8 h-8 rounded object-cover cursor-pointer border ${dark ? "border-gray-600" : "border-gray-300"} hover:border-cyan-500 transition`}
                        title="Check-in capture"
                        onClick={() =>
                          setPreviewImage(`${imgBase}${r.checkin_image}`)
                        }
                      />
                    )}
                    {r.checkout_image && (
                      <img
                        src={`${imgBase}${r.checkout_image}`}
                        alt="Check-out"
                        className={`w-8 h-8 rounded object-cover cursor-pointer border ${dark ? "border-gray-600" : "border-gray-300"} hover:border-cyan-500 transition`}
                        title="Check-out capture"
                        onClick={() =>
                          setPreviewImage(`${imgBase}${r.checkout_image}`)
                        }
                      />
                    )}
                    {!r.checkin_image && !r.checkout_image && (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </div>
                </td>
                {onEdit && (
                  <td className="p-3">
                    <button
                      onClick={() => onEdit(r)}
                      className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                        />
                      </svg>
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg max-h-[80vh]">
            <img
              src={previewImage}
              alt="Captured face"
              className="rounded-xl max-w-full max-h-[80vh] object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
