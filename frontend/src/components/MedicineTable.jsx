import { useState } from "react";

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function MedicineTable({ medicines, logs = [], onDelete, onDispense, onEdit }) {
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    slotNumber: 1,
    remainingQuantity: 0,
    lowThreshold: 1,
  });

  const startEdit = (medicine) => {
    setEditingId(medicine.medicineId);
    setEditForm({
      name: medicine.name,
      slotNumber: Number(medicine.slotNumber) || 1,
      remainingQuantity: Number(medicine.remainingQuantity) || 0,
      lowThreshold: Number(medicine.lowThreshold) || 1,
    });
  };

  const cancelEdit = () => {
    setEditingId("");
  };

  const saveEdit = async () => {
    if (!editingId || !onEdit) {
      return;
    }

    setSaving(true);
    try {
      await onEdit(editingId, {
        name: editForm.name.trim(),
        slotNumber: Number(editForm.slotNumber),
        remainingQuantity: Number(editForm.remainingQuantity),
        lowThreshold: Number(editForm.lowThreshold),
      });
      setEditingId("");
    } finally {
      setSaving(false);
    }
  };

  const historyByMedicine = logs.reduce((acc, log) => {
    const key = log.medicineId || log.medicineName;
    if (!key) {
      return acc;
    }

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(log);
    return acc;
  }, {});

  return (
    <section className="card p-4">
      <h3 className="text-lg font-semibold text-medical-900">Medicine List</h3>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-medical-700">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Slot</th>
              <th className="py-2">Remaining</th>
              <th className="py-2">Threshold</th>
              <th className="py-2">Last Dispense</th>
              <th className="py-2">History</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((medicine) => {
              const medicineLogs = (historyByMedicine[medicine.medicineId] || historyByMedicine[medicine.name] || []).slice();
              const sortedLogs = medicineLogs.sort(
                (a, b) => new Date(b.actualTime || b.createdAt || 0).getTime() - new Date(a.actualTime || a.createdAt || 0).getTime()
              );
              const lastLog = sortedLogs[0];
              const totalDispensed = sortedLogs.filter((log) => log.status === "taken").length;
              const isEditing = editingId === medicine.medicineId;

              return (
                <tr key={medicine.medicineId} className="border-t border-medical-100">
                  <td className="py-2">
                    {isEditing ? (
                      <input
                        className="input py-1"
                        value={editForm.name}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                      />
                    ) : (
                      medicine.name
                    )}
                  </td>
                  <td className="py-2">
                    {isEditing ? (
                      <select
                        className="input py-1"
                        value={editForm.slotNumber}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, slotNumber: Number(event.target.value) }))}
                      >
                        {[1, 2, 3, 4].map((slot) => (
                          <option key={slot} value={slot}>
                            Slot {slot}
                          </option>
                        ))}
                      </select>
                    ) : (
                      medicine.slotNumber
                    )}
                  </td>
                  <td className="py-2">
                    {isEditing ? (
                      <input
                        className="input py-1"
                        type="number"
                        min="0"
                        value={editForm.remainingQuantity}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, remainingQuantity: Number(event.target.value) }))}
                      />
                    ) : (
                      medicine.remainingQuantity
                    )}
                  </td>
                  <td className="py-2">
                    {isEditing ? (
                      <input
                        className="input py-1"
                        type="number"
                        min="1"
                        value={editForm.lowThreshold}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, lowThreshold: Number(event.target.value) }))}
                      />
                    ) : (
                      medicine.lowThreshold
                    )}
                  </td>
                  <td className="py-2">
                    {lastLog ? (
                      <div>
                        <p className="font-medium text-medical-900">{formatDateTime(lastLog.actualTime || lastLog.createdAt)}</p>
                        <p className="text-xs capitalize text-medical-700">{lastLog.status || "-"}</p>
                      </div>
                    ) : (
                      <span className="text-medical-700">No records</span>
                    )}
                  </td>
                  <td className="py-2">
                    <span className="rounded-full bg-medical-50 px-2 py-1 text-xs font-semibold text-medical-700">{totalDispensed} dispensed</span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button className="button-primary" onClick={saveEdit} disabled={saving || !editForm.name.trim()}>
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button className="button-secondary" onClick={cancelEdit} disabled={saving}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="button-secondary" onClick={() => onDispense(medicine.medicineId, medicine.name)}>
                            Mark Dispensed
                          </button>
                          <button className="button-secondary" onClick={() => startEdit(medicine)}>
                            Edit
                          </button>
                          <button
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            onClick={() => onDelete(medicine.medicineId)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {medicines.length === 0 && (
              <tr>
                <td className="py-6 text-center text-medical-700" colSpan="7">
                  No medicines added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
