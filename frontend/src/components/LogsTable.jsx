export default function LogsTable({ logs }) {
  return (
    <section className="card p-4">
      <h3 className="text-lg font-semibold text-medical-900">Dispensing History</h3>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-medical-700">
            <tr>
              <th className="py-2">Medicine</th>
              <th className="py-2">Scheduled</th>
              <th className="py-2">Actual</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.logId || log.id} className="border-t border-medical-100">
                <td className="py-2">{log.medicineName}</td>
                <td className="py-2">{log.scheduledTime || "-"}</td>
                <td className="py-2">{log.actualTime || "-"}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      log.status === "taken" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="py-6 text-center text-medical-700" colSpan="4">
                  No logs available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
