export default function SlotStatusGrid({ slotStatus = [] }) {
  const colorByStatus = {
    ok: "bg-emerald-100 text-emerald-700",
    low: "bg-amber-100 text-amber-700",
    empty: "bg-red-100 text-red-700",
  };

  return (
    <section className="card p-4">
      <h3 className="text-lg font-semibold text-medical-900">Tablet Slot Status</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {slotStatus.map((slot) => (
          <div key={slot.slotNumber} className="rounded-xl border border-medical-100 bg-medical-50 p-3">
            <p className="text-sm font-medium text-medical-700">Slot {slot.slotNumber}</p>
            <p className="mt-1 text-sm text-medical-900">{slot.medicineName || "No medicine"}</p>
            <p className="text-xs text-medical-700">Remaining: {slot.remainingQuantity || 0}</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${colorByStatus[slot.status]}`}>
              {slot.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
