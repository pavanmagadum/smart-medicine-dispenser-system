import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Battery, Power, Volume2, VolumeX, Pill, AlarmClock, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { Chart } from "chart.js/auto";
import "./SmartDispenserSimulator.css";

const STORAGE_KEY = "smart-dispenser-sim-v1";
const MISS_GRACE_MINUTES = 20;
const ALERT_WINDOW_MINUTES = 5;

function normalizeTimeValue(timeValue) {
  if (!timeValue || typeof timeValue !== "string") {
    return null;
  }

  const trimmed = timeValue.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([aApP][mM]))?$/);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3] ? match[3].toUpperCase() : null;

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (period) {
    if (hours < 1 || hours > 12) {
      return null;
    }

    if (period === "AM") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  }

  if (hours < 0 || hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseScheduledDate(dateKey, timeValue) {
  const normalized = normalizeTimeValue(timeValue);
  if (!normalized) {
    return null;
  }

  const [hour, minute] = normalized.split(":").map(Number);
  const base = new Date(`${dateKey}T00:00:00`);
  base.setHours(hour, minute, 0, 0);
  return base;
}

function formatClock(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour12: true,
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getDefaultState() {
  return {
    schedules: [
      { id: "sample-1", medicineName: "Vitamin D3", dosage: "1 tablet", time: "09:00", createdAt: Date.now() },
      { id: "sample-2", medicineName: "Metformin", dosage: "500 mg", time: "21:00", createdAt: Date.now() },
    ],
    history: [],
    deviceOn: true,
    soundOn: true,
    batteryLevel: 94,
    snoozeMap: {},
  };
}

export default function SmartDispenserSimulator({ dashboardSchedules = [], medicines = [], onDispenseMedicine }) {
  const stored = useMemo(() => getStoredState() || getDefaultState(), []);

  const [deviceOn, setDeviceOn] = useState(stored.deviceOn);
  const [soundOn, setSoundOn] = useState(stored.soundOn);
  const [batteryLevel, setBatteryLevel] = useState(stored.batteryLevel);
  const [localSchedules, setLocalSchedules] = useState(stored.schedules);
  const [history, setHistory] = useState(stored.history);
  const [snoozeMap, setSnoozeMap] = useState(stored.snoozeMap || {});
  const [now, setNow] = useState(new Date());
  const [booting, setBooting] = useState(true);
  const [activeAlert, setActiveAlert] = useState(null);
  const [dispenseArmed, setDispenseArmed] = useState(false);
  const [confirmingTaken, setConfirmingTaken] = useState(false);
  const [slotReady, setSlotReady] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const [pillDropTick, setPillDropTick] = useState(0);
  const [flashActive, setFlashActive] = useState(false);

  const [form, setForm] = useState({
    medicineName: "",
    dosage: "",
    time: "",
  });

  const chartCanvasRef = useRef(null);
  const chartRef = useRef(null);
  const audioContextRef = useRef(null);
  const previousQuantitiesRef = useRef({});
  const quantityPulseTimersRef = useRef([]);

  const [pulsingSlots, setPulsingSlots] = useState({});

  const medicineMap = useMemo(() => {
    const map = {};
    for (const medicine of medicines) {
      map[medicine.medicineId] = medicine;
    }
    return map;
  }, [medicines]);

  const dashboardDerivedSchedules = useMemo(() => {
    if (!dashboardSchedules.length) {
      return [];
    }

    return dashboardSchedules.flatMap((schedule) => {
      const matchedMedicine = medicineMap[schedule.medicineId];
      return (schedule.times || [])
        .map((time) => normalizeTimeValue(time))
        .filter(Boolean)
        .map((time, index) => ({
          id: `${schedule.scheduleId || schedule.medicineId}-${time}-${index}`,
        medicineName: matchedMedicine?.name || `Medicine ${schedule.medicineId?.slice(0, 4) || ""}`,
        dosage: matchedMedicine?.dosage || "As prescribed",
          medicineId: schedule.medicineId,
          slotNumber: matchedMedicine?.slotNumber ? Number(matchedMedicine.slotNumber) : null,
        time,
        createdAt: Date.now(),
        }));
    });
  }, [dashboardSchedules, medicineMap]);

  const isUsingDashboardSchedules = dashboardDerivedSchedules.length > 0;
  const schedules = isUsingDashboardSchedules ? dashboardDerivedSchedules : localSchedules;

  const holderSlots = useMemo(() => {
    const fromSchedules = schedules.reduce((acc, schedule) => {
      if (schedule.slotNumber && !acc[schedule.slotNumber]) {
        acc[schedule.slotNumber] = schedule;
      }
      return acc;
    }, {});

    return Array.from({ length: 4 }, (_, index) => {
      const slotNumber = index + 1;
      const medicine = medicines.find((item) => Number(item.slotNumber) === slotNumber);
      const fallback = fromSchedules[slotNumber];

      return {
        slotNumber,
        medicineName: medicine?.name || fallback?.medicineName || "Empty",
        quantity: medicine?.remainingQuantity ?? null,
      };
    });
  }, [medicines, schedules]);

  useEffect(() => {
    const changedSlots = [];

    holderSlots.forEach((slot) => {
      if (slot.quantity == null) {
        return;
      }

      const previousQuantity = previousQuantitiesRef.current[slot.slotNumber];
      if (typeof previousQuantity === "number" && previousQuantity !== slot.quantity) {
        changedSlots.push(slot.slotNumber);
      }

      previousQuantitiesRef.current[slot.slotNumber] = slot.quantity;
    });

    if (changedSlots.length === 0) {
      return;
    }

    setPulsingSlots((prev) => {
      const next = { ...prev };
      changedSlots.forEach((slotNumber) => {
        next[slotNumber] = true;
      });
      return next;
    });

    const timer = setTimeout(() => {
      setPulsingSlots((prev) => {
        const next = { ...prev };
        changedSlots.forEach((slotNumber) => {
          delete next[slotNumber];
        });
        return next;
      });
    }, 850);

    quantityPulseTimersRef.current.push(timer);
  }, [holderSlots]);

  useEffect(
    () => () => {
      quantityPulseTimersRef.current.forEach((timer) => clearTimeout(timer));
    },
    []
  );

  useEffect(() => {
    const startupTimer = setTimeout(() => setBooting(false), 1600);
    return () => clearTimeout(startupTimer);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const payload = {
      schedules: localSchedules,
      history,
      deviceOn,
      soundOn,
      batteryLevel,
      snoozeMap,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [localSchedules, history, deviceOn, soundOn, batteryLevel, snoozeMap]);

  useEffect(() => {
    if (!deviceOn) {
      return undefined;
    }

    const drainTimer = setInterval(() => {
      setBatteryLevel((prev) => Math.max(5, Number((prev - 0.3).toFixed(1))));
    }, 15000);

    return () => clearInterval(drainTimer);
  }, [deviceOn]);

  useEffect(() => {
    if (!deviceOn || !schedules.length) {
      return;
    }

    const nowTime = now.getTime();
    const todayKey = formatDateKey(now);

    setHistory((prevHistory) => {
      let updated = prevHistory;
      let changed = false;

      for (const schedule of schedules) {
        const dueAt = parseScheduledDate(todayKey, schedule.time);
        if (!dueAt) {
          continue;
        }

        const dueMs = dueAt.getTime();
        const graceMs = MISS_GRACE_MINUTES * 60 * 1000;

        const hasResolvedLog = updated.some(
          (entry) =>
            entry.scheduleId === schedule.id &&
            entry.dateKey === todayKey &&
            ["taken", "skipped", "missed"].includes(entry.action)
        );

        if (!hasResolvedLog && nowTime - dueMs > graceMs) {
          const missEntry = {
            id: `${schedule.id}-miss-${Date.now()}`,
            scheduleId: schedule.id,
            medicineName: schedule.medicineName,
            dosage: schedule.dosage,
            action: "missed",
            scheduledFor: dueAt.toISOString(),
            actualAt: new Date().toISOString(),
            dateKey: todayKey,
          };
          updated = [missEntry, ...updated];
          changed = true;
        }
      }

      return changed ? updated : prevHistory;
    });
  }, [now, schedules, deviceOn]);

  const playAlertBeep = useCallback(() => {
    if (!soundOn) {
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const base = ctx.currentTime;

      for (let i = 0; i < 3; i += 1) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "square";
        oscillator.frequency.value = 920 - i * 90;

        gain.gain.setValueAtTime(0.0001, base + i * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.22, base + i * 0.22 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, base + i * 0.22 + 0.18);

        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(base + i * 0.22);
        oscillator.stop(base + i * 0.22 + 0.2);
      }
    } catch {
      // If autoplay policies block audio, the visual alert still indicates the reminder.
    }
  }, [soundOn]);

  const handleTriggerTestAlarm = useCallback(() => {
    if (!deviceOn) {
      return;
    }

    const nowDate = new Date();
    setActiveAlert({
      schedule: {
        id: `test-alarm-${nowDate.getTime()}`,
        medicineName: "System Self-Test",
        dosage: "Alarm verification",
        time: `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`,
      },
      effectiveDue: nowDate,
      isTest: true,
    });
    setFlashActive(true);
    playAlertBeep();

    setTimeout(() => {
      setFlashActive(false);
    }, 1800);
  }, [deviceOn, playAlertBeep]);

  const triggerDispenseAnimation = useCallback(() => {
    setSlotOpen(true);
    setPillDropTick((prev) => prev + 1);
    if (activeAlert && !activeAlert.isTest) {
      setDispenseArmed(true);
      setSlotReady(true);
    }

    setTimeout(() => {
      setSlotOpen(false);
    }, 1300);
  }, [activeAlert]);

  useEffect(() => {
    if (!activeAlert || activeAlert.isTest) {
      setDispenseArmed(false);
      setSlotReady(false);
      return;
    }

    setSlotReady(true);
  }, [activeAlert]);

  useEffect(() => {
    if (!deviceOn || !soundOn || !activeAlert) {
      return undefined;
    }

    if (activeAlert.isTest) {
      playAlertBeep();
      return undefined;
    }

    playAlertBeep();
    const intervalId = setInterval(() => {
      playAlertBeep();
    }, 1750);

    return () => clearInterval(intervalId);
  }, [activeAlert, deviceOn, soundOn, playAlertBeep]);

  useEffect(() => {
    if (!deviceOn || activeAlert) {
      return;
    }

    const nowMs = now.getTime();
    const todayKey = formatDateKey(now);

    const unresolvedSchedule = schedules
      .map((schedule) => {
        const baseDue = parseScheduledDate(todayKey, schedule.time);
        if (!baseDue) {
          return null;
        }

        const snoozedUntil = snoozeMap[schedule.id] ? new Date(snoozeMap[schedule.id]) : null;
        const effectiveDue = snoozedUntil && snoozedUntil > baseDue ? snoozedUntil : baseDue;

        const hasTaken = history.some(
          (entry) => entry.scheduleId === schedule.id && entry.dateKey === todayKey && entry.action === "taken"
        );
        const hasSkipped = history.some(
          (entry) => entry.scheduleId === schedule.id && entry.dateKey === todayKey && entry.action === "skipped"
        );
        const hasMissed = history.some(
          (entry) => entry.scheduleId === schedule.id && entry.dateKey === todayKey && entry.action === "missed"
        );

        if (hasTaken || hasSkipped || hasMissed) {
          return null;
        }

        const alertWindowMs = ALERT_WINDOW_MINUTES * 60 * 1000;
        const dueMs = effectiveDue.getTime();

        if (nowMs >= dueMs && nowMs <= dueMs + alertWindowMs) {
          return {
            schedule,
            effectiveDue,
          };
        }

        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.effectiveDue.getTime() - b.effectiveDue.getTime())[0];

    if (unresolvedSchedule) {
      setActiveAlert(unresolvedSchedule);
      setFlashActive(true);

      setTimeout(() => {
        setFlashActive(false);
      }, 2200);
    }
  }, [now, schedules, history, snoozeMap, activeAlert, deviceOn]);

  const addHistoryEntry = useCallback((schedule, action) => {
    const todayKey = formatDateKey(new Date());
    const scheduledFor = parseScheduledDate(todayKey, schedule.time);
    if (!scheduledFor) {
      return;
    }

    const entry = {
      id: `${schedule.id}-${action}-${Date.now()}`,
      scheduleId: schedule.id,
      medicineName: schedule.medicineName,
      dosage: schedule.dosage,
      action,
      scheduledFor: scheduledFor.toISOString(),
      actualAt: new Date().toISOString(),
      dateKey: todayKey,
    };

    setHistory((prev) => [entry, ...prev]);
  }, []);

  const handleTaken = useCallback(async () => {
    if (!activeAlert) {
      return;
    }

    if (!activeAlert.isTest && !dispenseArmed) {
      return;
    }

    if (confirmingTaken) {
      return;
    }

    if (!activeAlert.isTest && activeAlert.schedule.medicineId && typeof onDispenseMedicine === "function") {
      try {
        setConfirmingTaken(true);
        await onDispenseMedicine(activeAlert.schedule.medicineId, activeAlert.schedule.medicineName);
      } finally {
        setConfirmingTaken(false);
      }
    }

    addHistoryEntry(activeAlert.schedule, "taken");
    setSnoozeMap((prev) => {
      const next = { ...prev };
      delete next[activeAlert.schedule.id];
      return next;
    });
    setDispenseArmed(false);
    setSlotReady(false);
    setActiveAlert(null);
  }, [activeAlert, addHistoryEntry, dispenseArmed, confirmingTaken, onDispenseMedicine]);

  const handleSkip = useCallback(() => {
    if (!activeAlert) {
      return;
    }
    addHistoryEntry(activeAlert.schedule, "skipped");
    setSnoozeMap((prev) => {
      const next = { ...prev };
      delete next[activeAlert.schedule.id];
      return next;
    });
    setDispenseArmed(false);
    setSlotReady(false);
    setActiveAlert(null);
  }, [activeAlert, addHistoryEntry]);

  const handleSnooze = useCallback(() => {
    if (!activeAlert) {
      return;
    }

    const snoozeUntil = new Date(Date.now() + 5 * 60 * 1000);
    setSnoozeMap((prev) => ({
      ...prev,
      [activeAlert.schedule.id]: snoozeUntil.toISOString(),
    }));
    setDispenseArmed(false);
    setSlotReady(false);
    setActiveAlert(null);
  }, [activeAlert]);

  const scheduleStateMap = useMemo(() => {
    const todayKey = formatDateKey(now);
    const map = {};

    for (const schedule of schedules) {
      const todayDue = parseScheduledDate(todayKey, schedule.time);
      if (!todayDue) {
        map[schedule.id] = "pending";
        continue;
      }

      const taken = history.some(
        (entry) => entry.scheduleId === schedule.id && entry.dateKey === todayKey && entry.action === "taken"
      );
      const skipped = history.some(
        (entry) => entry.scheduleId === schedule.id && entry.dateKey === todayKey && entry.action === "skipped"
      );
      const missed = history.some(
        (entry) => entry.scheduleId === schedule.id && entry.dateKey === todayKey && entry.action === "missed"
      );

      if (taken) {
        map[schedule.id] = "taken";
      } else if (skipped) {
        map[schedule.id] = "missed";
      } else if (missed || now.getTime() - todayDue.getTime() > MISS_GRACE_MINUTES * 60 * 1000) {
        map[schedule.id] = "missed";
      } else {
        map[schedule.id] = "pending";
      }
    }

    return map;
  }, [schedules, history, now]);

  const nextSchedule = useMemo(() => {
    if (!schedules.length) {
      return null;
    }

    const todayKey = formatDateKey(now);
    const nowMs = now.getTime();

    const ranked = schedules
      .map((schedule) => {
        const todayDue = parseScheduledDate(todayKey, schedule.time);
        if (!todayDue) {
          return null;
        }

        const snoozed = snoozeMap[schedule.id] ? new Date(snoozeMap[schedule.id]) : null;
        const due = snoozed && snoozed > todayDue ? snoozed : todayDue;

        let nextDue = due;
        if (due.getTime() < nowMs) {
          nextDue = new Date(due);
          nextDue.setDate(nextDue.getDate() + 1);
        }

        return { schedule, nextDue };
      })
      .filter(Boolean)
      .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());

    return ranked[0] || null;
  }, [schedules, now, snoozeMap]);

  const activeDispenseSlot = activeAlert?.schedule?.slotNumber || null;
  const nextDispenseSlot = nextSchedule?.schedule?.slotNumber || null;

  const chartSummary = useMemo(() => {
    const nowDate = new Date();
    const labels = [];
    const takenData = [];
    const missedData = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(nowDate);
      date.setDate(nowDate.getDate() - i);
      const key = formatDateKey(date);
      labels.push(new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date));

      const dayTaken = history.filter((item) => item.dateKey === key && item.action === "taken").length;
      const dayMissed = history.filter((item) => item.dateKey === key && ["missed", "skipped"].includes(item.action)).length;

      takenData.push(dayTaken);
      missedData.push(dayMissed);
    }

    return { labels, takenData, missedData };
  }, [history]);

  useEffect(() => {
    if (!chartCanvasRef.current) {
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(chartCanvasRef.current, {
      type: "line",
      data: {
        labels: chartSummary.labels,
        datasets: [
          {
            label: "Taken",
            data: chartSummary.takenData,
            borderColor: "#16a34a",
            backgroundColor: "rgba(22, 163, 74, 0.18)",
            tension: 0.35,
            fill: true,
          },
          {
            label: "Missed / Skipped",
            data: chartSummary.missedData,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        animation: {
          duration: 500,
        },
        plugins: {
          legend: {
            labels: {
              color: "#dbeafe",
              boxWidth: 12,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#bfdbfe" },
            grid: { color: "rgba(147, 197, 253, 0.12)" },
          },
          y: {
            ticks: { color: "#bfdbfe", precision: 0 },
            grid: { color: "rgba(147, 197, 253, 0.12)" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [chartSummary]);

  const adherenceStats = useMemo(() => {
    const taken = history.filter((h) => h.action === "taken").length;
    const missed = history.filter((h) => ["missed", "skipped"].includes(h.action)).length;
    const total = taken + missed;
    const score = total ? Math.round((taken / total) * 100) : 100;
    return { taken, missed, score };
  }, [history]);

  const handleAddSchedule = useCallback(
    (event) => {
      event.preventDefault();
      if (!form.medicineName || !form.dosage || !form.time) {
        return;
      }

      const schedule = {
        id: `med-${Date.now()}`,
        medicineName: form.medicineName.trim(),
        dosage: form.dosage.trim(),
        time: form.time,
        slotNumber: ((schedules.length % 4) + 1),
        createdAt: Date.now(),
      };

      setLocalSchedules((prev) => [...prev, schedule].sort((a, b) => a.time.localeCompare(b.time)));
      setForm({ medicineName: "", dosage: "", time: "" });
    },
    [form]
  );

  const handleDeleteSchedule = useCallback((id) => {
    setLocalSchedules((prev) => prev.filter((item) => item.id !== id));
  }, []);

  if (booting) {
    return (
      <section className="sim-boot card p-10">
        <div className="sim-boot__pulse" />
        <p className="sim-boot__text">Booting Smart Dispenser OS...</p>
      </section>
    );
  }

  return (
    <section className={`sim-root ${flashActive ? "sim-root--flash" : ""}`}>
      <div className="sim-shell">
        <header className="sim-shell__topbar">
          <div>
            <h3 className="sim-title">Smart Medicine Reminder and Auto Dispense</h3>
            <p className="sim-subtitle">Browser-embedded simulation with realistic behavior</p>
          </div>

          <div className="sim-toggles">
            <button className={`sim-chip ${deviceOn ? "is-on" : ""}`} onClick={() => setDeviceOn((prev) => !prev)}>
              <Power size={14} />
              {deviceOn ? "Device ON" : "Device OFF"}
            </button>

            <button className={`sim-chip ${soundOn ? "is-on" : ""}`} onClick={() => setSoundOn((prev) => !prev)}>
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {soundOn ? "Sound ON" : "Sound OFF"}
            </button>

            <button className="sim-chip" onClick={handleTriggerTestAlarm} disabled={!deviceOn}>
              <BellRing size={14} />
              Test Alarm
            </button>
          </div>
        </header>

        <div className="sim-grid">
          <article className="sim-device">
            <div className="sim-device__bezel">
              <div className="sim-display">
                <div className="sim-display__clock">{formatClock(now)}</div>
                <div className="sim-display__row">
                  <span>Next:</span>
                  <strong>
                    {nextSchedule
                      ? `${nextSchedule.schedule.medicineName} (${nextSchedule.schedule.dosage}) at ${formatTime(nextSchedule.nextDue)}`
                      : "No schedules"}
                  </strong>
                </div>
                <div className="sim-display__row">
                  <span>Status:</span>
                  <strong className={`status-pill status-${activeAlert ? "pending" : nextSchedule ? scheduleStateMap[nextSchedule.schedule.id] : "pending"}`}>
                    {activeAlert ? "Pending" : nextSchedule ? scheduleStateMap[nextSchedule.schedule.id] : "Pending"}
                  </strong>
                </div>
                <div className="sim-display__battery">
                  <Battery size={14} />
                  <span>{Math.round(batteryLevel)}%</span>
                  <div className="sim-battery-bar">
                    <div className="sim-battery-fill" style={{ width: `${Math.max(8, batteryLevel)}%` }} />
                  </div>
                </div>
              </div>

              <div className="sim-holders-wrap">
                <svg className="sim-routing" viewBox="0 0 300 130" preserveAspectRatio="none" aria-hidden="true">
                  {[1, 2, 3, 4].map((slotNumber) => (
                    <path
                      key={slotNumber}
                      d={`M ${slotNumber <= 2 ? 35 : 265} ${slotNumber % 2 === 1 ? 26 : 98} Q 150 ${slotNumber <= 2 ? 30 : 100} 150 64`}
                      className={`sim-route ${activeDispenseSlot === slotNumber ? "is-active" : ""} ${
                        !activeDispenseSlot && nextDispenseSlot === slotNumber ? "is-next" : ""
                      }`}
                    />
                  ))}
                </svg>

                <div className="sim-holder-grid">
                  {holderSlots.map((holder) => (
                    <div
                      key={holder.slotNumber}
                      className={`sim-holder-box ${activeDispenseSlot === holder.slotNumber ? "is-active" : ""} ${
                        !activeDispenseSlot && nextDispenseSlot === holder.slotNumber ? "is-next" : ""
                      }`}
                    >
                      <p className="sim-holder-slot">BOX {holder.slotNumber}</p>
                      <p className="sim-holder-name">{holder.medicineName}</p>
                      <p className={`sim-holder-meta ${pulsingSlots[holder.slotNumber] ? "is-updating" : ""}`}>
                        {holder.quantity == null ? "-" : `${holder.quantity} tabs left`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sim-hardware">
                <div className={`sim-slot ${slotOpen ? "is-open" : ""}`}>Slot</div>
                <div className={`sim-ready-tray ${slotReady ? "is-ready" : ""}`}>
                  <span>Ready To Dispense</span>
                  <div className={`sim-ready-pill ${slotReady ? "is-visible" : ""}`} />
                </div>
                <div className="sim-slot-info">
                  <span>
                    Current source: {activeDispenseSlot ? `BOX ${activeDispenseSlot}` : "Waiting"}
                  </span>
                  <span>
                    Next queue: {nextDispenseSlot ? `BOX ${nextDispenseSlot}` : "--"}
                  </span>
                </div>
                <div className="sim-dropzone">
                  <div key={pillDropTick} className={`sim-pill ${slotOpen ? "is-dropping" : ""}`} />
                </div>
                <button className="sim-dispense-button" onClick={triggerDispenseAnimation} disabled={!deviceOn || Boolean(activeAlert?.isTest)}>
                  <Pill size={16} /> Dispense
                </button>
              </div>
            </div>

            {activeAlert && (
              <div className="sim-alert">
                <div className="sim-alert__head">
                  <BellRing size={18} />
                  <strong>{activeAlert.isTest ? "Alarm Test" : "Medicine Reminder"}</strong>
                </div>
                {activeAlert.isTest ? (
                  <>
                    <p>
                      Alarm verification is active. Use this to confirm popup visibility and sound output.
                    </p>
                    <div className="sim-alert__actions">
                      <button className="sim-action sim-action--snooze" onClick={playAlertBeep}>
                        <BellRing size={15} /> Replay Sound
                      </button>
                      <button className="sim-action sim-action--taken" onClick={() => setActiveAlert(null)}>
                        <CheckCircle2 size={15} /> Dismiss
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Time for <strong>{activeAlert.schedule.medicineName}</strong> ({activeAlert.schedule.dosage}).
                    </p>
                    <div className="sim-alert__actions">
                      <button className="sim-action sim-action--snooze" onClick={triggerDispenseAnimation}>
                        <Pill size={15} /> Dispense From Box
                      </button>
                      <button className="sim-action sim-action--taken" onClick={handleTaken} disabled={!dispenseArmed || confirmingTaken}>
                        <CheckCircle2 size={15} /> {confirmingTaken ? "Confirming..." : "Confirm Taken"}
                      </button>
                      <button className="sim-action sim-action--skip" onClick={handleSkip}>
                        <XCircle size={15} /> Skip
                      </button>
                      <button className="sim-action sim-action--snooze" onClick={handleSnooze}>
                        <Clock3 size={15} /> Snooze 5m
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </article>

          <article className="sim-panel">
            <h4>Medicine Scheduler</h4>
            {isUsingDashboardSchedules && (
              <p className="sim-empty">Using live schedules from Dashboard tab. Add or edit schedules there.</p>
            )}
            <form className="sim-form" onSubmit={handleAddSchedule}>
              <input
                className="input"
                placeholder="Medicine name"
                value={form.medicineName}
                onChange={(event) => setForm((prev) => ({ ...prev, medicineName: event.target.value }))}
                disabled={isUsingDashboardSchedules}
              />
              <input
                className="input"
                placeholder="Dosage (e.g., 1 tablet)"
                value={form.dosage}
                onChange={(event) => setForm((prev) => ({ ...prev, dosage: event.target.value }))}
                disabled={isUsingDashboardSchedules}
              />
              <input
                className="input"
                type="time"
                value={form.time}
                onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                disabled={isUsingDashboardSchedules}
              />
              <button className="button-primary" type="submit" disabled={!deviceOn || isUsingDashboardSchedules}>
                <AlarmClock size={14} className="inline-block mr-1" /> Add Schedule
              </button>
            </form>

            <div className="sim-schedules">
              {schedules.map((schedule) => (
                <div className="sim-schedule-item" key={schedule.id}>
                  <div>
                    <p className="sim-schedule-item__name">{schedule.medicineName}</p>
                    <p className="sim-schedule-item__meta">
                      {schedule.dosage} at {schedule.time}
                    </p>
                  </div>
                  <div className="sim-schedule-item__right">
                    <span className={`status-pill status-${scheduleStateMap[schedule.id]}`}>{scheduleStateMap[schedule.id]}</span>
                    {!isUsingDashboardSchedules && (
                      <button className="sim-delete" onClick={() => handleDeleteSchedule(schedule.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {schedules.length === 0 && <p className="sim-empty">No schedules configured.</p>}
            </div>
          </article>
        </div>

        <div className="sim-history-grid">
          <article className="sim-panel sim-chart-panel">
            <h4>Adherence Trend (7 days)</h4>
            <div className="sim-chart-wrap">
              <canvas ref={chartCanvasRef} />
            </div>
          </article>

          <article className="sim-panel">
            <h4>History Log</h4>
            <div className="sim-stats">
              <span>Taken: {adherenceStats.taken}</span>
              <span>Missed/Skipped: {adherenceStats.missed}</span>
              <span>Adherence: {adherenceStats.score}%</span>
            </div>
            <div className="sim-history-list">
              {history.slice(0, 12).map((item) => (
                <div className="sim-history-item" key={item.id}>
                  <div>
                    <p className="sim-history-item__name">{item.medicineName}</p>
                    <p className="sim-history-item__meta">{new Date(item.actualAt).toLocaleString()}</p>
                  </div>
                  <span className={`status-pill status-${item.action === "taken" ? "taken" : "missed"}`}>{item.action}</span>
                </div>
              ))}
              {history.length === 0 && <p className="sim-empty">No medication actions yet.</p>}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
