// frontend/src/pages/student/Notifications.jsx
// -----------------------------------------------
// Notifications page — list of transport alerts/updates.
// Shows timestamp, type badge, and message text.
// -----------------------------------------------


import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { fetchStudentAlerts } from "../../api";
import "./Notifications.css";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  useEffect(() => {
    async function loadAlerts() {
      if (!username) return;
      try {
        const res = await fetchStudentAlerts(username);
        if (res.success) {
          setNotifications(res.alerts);
        }
      } catch (e) {
        console.error("Failed to load alerts:", e);
      } finally {
        setLoading(false);
      }
    }
    
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [username]);

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark a notification as read
  function markAsRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  if (loading) {
    return (
      <div className="student-loading">
        <div className="student-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-page" id="notifications-page">
      <div className="notif-header">
        <div>
          <h2 className="notif-title">Notifications</h2>
          <p className="notif-desc">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
              : "You're all caught up!"}
          </p>
        </div>
      </div>

      <div className="notif-list">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`notif-item ${notif.read ? "" : "unread"}`}
            onClick={() => markAsRead(notif.id)}
          >
            <div className="notif-left">
              <span className={`notif-type-badge notif-${notif.type || 'info'}`}>
                {notif.type === "alert" || notif.type === "danger" ? <AlertTriangle size={16} /> : notif.type === "warning" ? <AlertTriangle size={16} /> : notif.type === "success" ? <CheckCircle size={16} /> : <Info size={16} />}
              </span>
            </div>
            <div className="notif-body">
              <h4 className="notif-item-title">{notif.title}</h4>
              <p className="notif-item-message">{notif.message}</p>
              <span className="notif-timestamp">{notif.timestamp}</span>
            </div>
            {!notif.read && <span className="notif-unread-dot"></span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Notifications;
