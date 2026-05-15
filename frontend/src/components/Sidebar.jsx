import { LayoutDashboard, Pill, CalendarClock, Bell, Cpu, LogOut, X } from "lucide-react";

const items = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "simulator", label: "Simulator", icon: Cpu },
  { key: "medicines", label: "Medicines", icon: Pill },
  { key: "schedules", label: "Schedules", icon: CalendarClock },
  { key: "alerts", label: "Alerts", icon: Bell },
];

export default function Sidebar({ activeTab, onChangeTab, onLogout, profile, unreadCount = 0, isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-medical-900/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform card h-full p-6 transition-transform duration-300 ease-in-out lg:static lg:w-full lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-medical-900">MediGuardian</h1>
            <p className="mt-1 text-sm text-medical-700">Smart dispensing</p>
          </div>
          <button 
            className="rounded-lg p-2 text-medical-700 hover:bg-medical-100 lg:hidden active:scale-95" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-2 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onChangeTab(item.key);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition active:scale-95 ${
                  active ? "bg-medical-500 text-white shadow-md shadow-medical-500/20" : "text-medical-800 hover:bg-medical-50"
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

        <div className="absolute bottom-6 left-6 right-6">
          <div className="rounded-xl bg-medical-50 p-3 text-sm text-medical-700">
            <p className="font-semibold text-medical-900">Signed in as</p>
            <p className="truncate">{profile?.name || "User"}</p>
            <p className="capitalize">Role: {profile?.role || "-"}</p>
          </div>

          <button
            onClick={onLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 active:scale-95 active:bg-red-100"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
