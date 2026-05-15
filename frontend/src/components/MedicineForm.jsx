import { memo, useState } from "react";

const defaultState = {
  name: "",
  slotNumber: 1,
  totalQuantity: "",
  remainingQuantity: "",
  lowThreshold: "",
  dosageTiming: "",
};

function MedicineForm({ onSubmit }) {
  const [form, setForm] = useState(defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
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
    } finally {
      setIsSubmitting(false);
    }
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
      <button className="button-primary mt-4 flex justify-center items-center gap-2" type="submit" disabled={isSubmitting}>
        {isSubmitting && (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {isSubmitting ? "Saving..." : "Save Medicine"}
      </button>
    </form>
  );
}

export default memo(MedicineForm);
