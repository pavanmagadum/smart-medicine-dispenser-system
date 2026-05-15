import { memo } from "react";

function NotificationPanel({ notifications, onMarkRead, markingReadIds = [] }) {
  const unreadCount = notifications.filter((item) => item.status !== "read").length;

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-medical-900">Alerts and Notifications</h3>
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Unread: {unreadCount}</span>
      </div>
      <div className="mt-3 space-y-3">
        {notifications.map((notification) => (
          <article
            key={notification.notificationId || notification.id}
            className={`rounded-xl border p-3 ${
              notification.status === "read" ? "border-medical-100 bg-medical-50" : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-medical-900">{notification.type}</p>
                <p className="text-sm text-medical-700">{notification.message}</p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-medical-600">{notification.status || "unread"}</p>
                  <p className="text-xs text-medical-500">
                    {notification.createdAt ? (
                      typeof notification.createdAt?.toDate === "function" 
                        ? notification.createdAt.toDate().toLocaleString() 
                        : new Date(notification.createdAt).toLocaleString()
                    ) : "Just now"}
                  </p>
                </div>
              </div>
              {notification.status !== "read" && (
                <button
                  className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-medical-700 hover:bg-medical-100 active:scale-95 transition disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={markingReadIds.includes(notification.notificationId || notification.id)}
                  onClick={() => onMarkRead(notification.notificationId || notification.id)}
                >
                  {markingReadIds.includes(notification.notificationId || notification.id) ? "Marking..." : "Mark Read"}
                </button>
              )}
            </div>
          </article>
        ))}
        {notifications.length === 0 && <p className="text-sm text-medical-700">No new alerts.</p>}
      </div>
    </section>
  );
}

export default memo(NotificationPanel);
