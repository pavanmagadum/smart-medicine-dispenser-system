import { LayoutDashboard, Pill, CalendarClock, Bell, Cpu, LogOut } from "lucide-react";

const items = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "simulator", label: "Simulator", icon: Cpu },
  { key: "medicines", label: "Medicines", icon: Pill },
  { key: "schedules", label: "Schedules", icon: CalendarClock },
  { key: "alerts", label: "Alerts", icon: Bell },
];

export default function Sidebar({ activeTab, onChangeTab, onLogout, profile, unreadCount = 0 }) {
  return (
    <aside className="card h-full p-4 lg:p-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-medical-900">MediGuardian</h1>
        <p className="mt-1 text-sm text-medical-700">Smart dispensing dashboard</p>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChangeTab(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active ? "bg-medical-500 text-white" : "text-medical-800 hover:bg-medical-50"
              }`}
            >
              <Icon size={18} />
              {item.label}
              {item.key === "alerts" && unreadCount > 0 && (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 rounded-xl bg-medical-50 p-3 text-sm text-medical-700">
        <p className="font-semibold text-medical-900">Signed in as</p>
        <p>{profile?.name || "User"}</p>
        <p className="capitalize">Role: {profile?.role || "-"}</p>
      </div>

      <button
        onClick={onLogout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        <LogOut size={16} /> Logout
      </button>
    </aside>
  );
}
