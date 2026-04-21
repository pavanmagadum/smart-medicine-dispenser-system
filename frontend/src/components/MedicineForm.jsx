import { useState } from "react";

const defaultState = {
  name: "",
  slotNumber: 1,
  totalQuantity: "",
  remainingQuantity: "",
  lowThreshold: "",
  dosageTiming: "",
};

export default function MedicineForm({ onSubmit }) {
  const [form, setForm] = useState(defaultState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      slotNumber: Number(form.slotNumber),
      totalQuantity: Number(form.totalQuantity),
      remainingQuantity: form.remainingQuantity ? Number(form.remainingQuantity) : undefined,
      lowThreshold: Number(form.lowThreshold),
      dosageTiming: form.dosageTiming
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });

    setForm(defaultState);
  };

  return (
    <form className="card p-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-medical-900">Add Medicine</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input className="input" name="name" value={form.name} onChange={handleChange} placeholder="Medicine name" required />
        <select className="input" name="slotNumber" value={form.slotNumber} onChange={handleChange}>
          {[1, 2, 3, 4].map((slot) => (
            <option key={slot} value={slot}>
              Slot {slot}
            </option>
          ))}
        </select>
        <input className="input" type="number" min="1" name="totalQuantity" value={form.totalQuantity} onChange={handleChange} placeholder="Total quantity" required />
        <input className="input" type="number" min="0" name="remainingQuantity" value={form.remainingQuantity} onChange={handleChange} placeholder="Remaining (optional)" />
        <input className="input" type="number" min="1" name="lowThreshold" value={form.lowThreshold} onChange={handleChange} placeholder="Low threshold" required />
        <input
          className="input"
          name="dosageTiming"
          value={form.dosageTiming}
          onChange={handleChange}
          placeholder="Dosage notes (e.g. before breakfast,night)"
        />
      </div>
      <button className="button-primary mt-4" type="submit">
        Save Medicine
      </button>
    </form>
  );
}
