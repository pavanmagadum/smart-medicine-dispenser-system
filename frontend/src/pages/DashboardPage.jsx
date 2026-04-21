import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import SummaryCards from "../components/SummaryCards";
import SlotStatusGrid from "../components/SlotStatusGrid";
import MedicineForm from "../components/MedicineForm";
import MedicineTable from "../components/MedicineTable";
import ScheduleForm from "../components/ScheduleForm";
import LogsTable from "../components/LogsTable";
import NotificationPanel from "../components/NotificationPanel";
import SmartDispenserSimulator from "../components/SmartDispenserSimulator";
import { useAuth } from "../context/AuthContext";
import useRealtimeCollection from "../hooks/useRealtimeCollection";
import { dashboardApi, logApi, medicineApi, notificationApi, scheduleApi } from "../services/api";

export default function DashboardPage() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [targetUserId, setTargetUserId] = useState("");

  const selectedUserId = targetUserId || profile?.uid || profile?.userId;

  const { items: realtimeNotifications } = useRealtimeCollection({
    collectionName: "notifications",
    userId: selectedUserId,
  });

  const { items: realtimeLogs } = useRealtimeCollection({
    collectionName: "logs",
    userId: selectedUserId,
  });

  const [medicines, setMedicines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [markingReadIds, setMarkingReadIds] = useState([]);
  const [optimisticReadIds, setOptimisticReadIds] = useState([]);

  const refreshDashboard = async () => {
    if (!selectedUserId) {
      return;
    }

    const [medicineRes, scheduleRes, summaryRes, logsRes] = await Promise.allSettled([
      medicineApi.getMedicines(selectedUserId),
      scheduleApi.getSchedule(selectedUserId),
      dashboardApi.getSummary(selectedUserId),
      logApi.getLogs(selectedUserId),
    ]);

    if (medicineRes.status === "fulfilled") {
      setMedicines(medicineRes.value.data.medicines || []);
    }

    if (scheduleRes.status === "fulfilled") {
      setSchedules(scheduleRes.value.data.schedules || []);
    }

    if (summaryRes.status === "fulfilled") {
      setSummary(summaryRes.value.data.summary || null);
    }

    if (logsRes.status === "fulfilled") {
      setLogs(logsRes.value.data.logs || []);
    }
  };

  const displayLogs = realtimeLogs.length > 0 ? realtimeLogs : logs;

  const displayNotifications = useMemo(
    () =>
      realtimeNotifications.map((notification) => {
        const notificationId = notification.notificationId || notification.id;
        if (!optimisticReadIds.includes(notificationId)) {
          return notification;
        }

        return { ...notification, status: "read" };
      }),
    [realtimeNotifications, optimisticReadIds]
  );

  const unreadNotificationCount = useMemo(
    () => displayNotifications.filter((item) => item.status !== "read").length,
    [displayNotifications]
  );

  useEffect(() => {
    refreshDashboard();
  }, [selectedUserId]);

  const handleAddMedicine = async (payload) => {
    await medicineApi.addMedicine({ ...payload, targetUserId: selectedUserId });
    await refreshDashboard();
  };

  const handleDeleteMedicine = async (medicineId) => {
    await medicineApi.deleteMedicine(medicineId);
    await refreshDashboard();
  };

  const handleUpdateMedicine = async (medicineId, payload) => {
    await medicineApi.updateMedicine(medicineId, payload);
    await refreshDashboard();
  };

  const handleDispense = async (medicineId, medicineName) => {
    await medicineApi.updateStatus(medicineId, { status: "taken", medicineName });
    await logApi.updateStatus({
      targetUserId: selectedUserId,
      medicineId,
      medicineName,
      status: "taken",
      actualTime: new Date().toISOString(),
    });
    await refreshDashboard();
  };

  const handleCreateSchedule = async (payload) => {
    await scheduleApi.createSchedule({ ...payload, targetUserId: selectedUserId });
    await refreshDashboard();
  };

  const handleDeleteSchedule = async (scheduleId) => {
    await scheduleApi.deleteSchedule(scheduleId);
    await refreshDashboard();
  };

  const handleMarkRead = async (notificationId) => {
    setMarkingReadIds((prev) => [...prev, notificationId]);
    setOptimisticReadIds((prev) => [...prev, notificationId]);

    try {
      await notificationApi.markRead(notificationId);
    } catch {
      setOptimisticReadIds((prev) => prev.filter((id) => id !== notificationId));
    } finally {
      setMarkingReadIds((prev) => prev.filter((id) => id !== notificationId));
    }
  };

  return (
    <main className="h-screen overflow-hidden p-4 md:p-6">
      <div className="mx-auto grid h-full max-w-7xl gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Sidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onLogout={logout}
          profile={profile}
          unreadCount={unreadNotificationCount}
        />

        <section className="h-full min-h-0 space-y-4 overflow-y-auto pr-1">
          <header className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-medical-900">Care Dashboard</h2>
                <p className="text-sm text-medical-700">Live medicine schedules, slot inventory, and adherence updates.</p>
              </div>

              {profile?.role === "caretaker" && (
                <input
                  className="input max-w-xs"
                  value={targetUserId}
                  onChange={(event) => setTargetUserId(event.target.value)}
                  placeholder="Enter linked user ID"
                />
              )}
            </div>
          </header>

          {activeTab !== "simulator" && (
            <>
              <SummaryCards summary={summary} />
              <SlotStatusGrid slotStatus={summary?.slotStatus || []} />
            </>
          )}

          {activeTab === "simulator" && (
            <SmartDispenserSimulator dashboardSchedules={schedules} medicines={medicines} onDispenseMedicine={handleDispense} />
          )}

          {(activeTab === "overview" || activeTab === "medicines") && (
            <>
              <MedicineForm onSubmit={handleAddMedicine} />
              <MedicineTable
                medicines={medicines}
                logs={displayLogs}
                onDelete={handleDeleteMedicine}
                onDispense={handleDispense}
                onEdit={handleUpdateMedicine}
              />
            </>
          )}

          {(activeTab === "overview" || activeTab === "schedules") && (
            <>
              <ScheduleForm medicines={medicines} onSubmit={handleCreateSchedule} />
              <section className="card p-4">
                <h3 className="text-lg font-semibold text-medical-900">Schedule List</h3>
                <div className="mt-3 space-y-2">
                  {schedules.map((schedule) => (
                    <div key={schedule.scheduleId} className="rounded-xl border border-medical-100 bg-medical-50 p-3 text-sm">
                      <p>
                        <span className="font-semibold">Medicine:</span>{" "}
                        {medicines.find((medicine) => medicine.medicineId === schedule.medicineId)?.name || schedule.medicineId}
                      </p>
                      <p>
                        <span className="font-semibold">Times:</span> {(schedule.times || []).join(", ")}
                      </p>
                      <p>
                        <span className="font-semibold">Frequency:</span> {schedule.frequency}
                      </p>
                      <div className="mt-2">
                        <button
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          onClick={() => handleDeleteSchedule(schedule.scheduleId)}
                        >
                          Delete Schedule
                        </button>
                      </div>
                    </div>
                  ))}
                  {schedules.length === 0 && <p className="text-sm text-medical-700">No schedules available.</p>}
                </div>
              </section>
            </>
          )}

          {(activeTab === "overview" || activeTab === "alerts") && (
            <NotificationPanel notifications={displayNotifications} onMarkRead={handleMarkRead} markingReadIds={markingReadIds} />
          )}

          {activeTab !== "simulator" && <LogsTable logs={displayLogs} />}
        </section>
      </div>
    </main>
  );
}
