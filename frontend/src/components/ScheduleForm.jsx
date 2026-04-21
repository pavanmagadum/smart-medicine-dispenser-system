import { useState } from "react";

const initialState = {
  medicineId: "",
  selectedTime: "",
  times: [],
  frequency: "daily",
};

function formatTo12Hour(time) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${String(normalizedHour).padStart(2, "0")}:${minute} ${period}`;
}

export default function ScheduleForm({ medicines, onSubmit }) {
  const [form, setForm] = useState(initialState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.medicineId || form.times.length === 0) {
      return;
    }

    await onSubmit({
      medicineId: form.medicineId,
      times: form.times,
      frequency: form.frequency,
      enabled: true,
    });

    setForm(initialState);
  };

  const handleAddTime = () => {
    if (!form.selectedTime) {
      return;
    }

    if (form.times.includes(form.selectedTime)) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      times: [...prev.times, prev.selectedTime].sort((a, b) => a.localeCompare(b)),
      selectedTime: "",
    }));
  };

  const handleRemoveTime = (timeToRemove) => {
    setForm((prev) => ({
      ...prev,
      times: prev.times.filter((time) => time !== timeToRemove),
    }));
  };

  return (
    <form className="card p-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-medical-900">Set Daily Schedule</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <select className="input" name="medicineId" value={form.medicineId} onChange={handleChange} required>
          <option value="">Select medicine</option>
          {medicines.map((medicine) => (
            <option key={medicine.medicineId} value={medicine.medicineId}>
              {medicine.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            className="input"
            type="time"
            name="selectedTime"
            value={form.selectedTime}
            onChange={handleChange}
          />
          <button className="button-secondary whitespace-nowrap" type="button" onClick={handleAddTime}>
            Add Time
          </button>
        </div>
        <select className="input" name="frequency" value={form.frequency} onChange={handleChange}>
          <option value="daily">Daily</option>
          <option value="alternate-days">Alternate Days</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {form.times.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => handleRemoveTime(time)}
            className="rounded-full border border-medical-200 bg-medical-50 px-3 py-1 text-xs font-semibold text-medical-700 hover:bg-medical-100"
          >
            {formatTo12Hour(time)} x
          </button>
        ))}
        {form.times.length === 0 && <span className="text-xs text-medical-600">Add at least one time.</span>}
      </div>

      <button className="button-primary mt-4" type="submit">
        Save Schedule
      </button>
    </form>
  );
}
