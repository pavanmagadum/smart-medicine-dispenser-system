import { Clock3, Bell, AlertTriangle, PillBottle } from "lucide-react";

export default function SummaryCards({ summary }) {
  const cards = [
    {
      label: "Next Medicine",
      value: summary?.nextMedicineTime || "Not scheduled",
      icon: Clock3,
    },
    {
      label: "Active Medicines",
      value: summary?.medicineCount ?? 0,
      icon: PillBottle,
    },
    {
      label: "Missed Doses",
      value: summary?.missedCount ?? 0,
      icon: AlertTriangle,
    },
    {
      label: "Unread Alerts",
      value: summary?.unreadNotifications ?? 0,
      icon: Bell,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-medical-700">{card.label}</span>
              <Icon className="text-medical-500" size={18} />
            </div>
            <p className="mt-2 text-2xl font-bold text-medical-900">{card.value}</p>
          </article>
        );
      })}
    </div>
  );
}
