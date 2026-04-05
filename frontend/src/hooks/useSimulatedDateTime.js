// frontend/src/hooks/useSimulatedDateTime.js
// -------------------------------------------
// Fetches the admin-configured simulated date/time from Supabase.
// Falls back to the real current date/time if nothing is set.
// -------------------------------------------

import { useState, useEffect } from "react";
import { fetchSimulatedDateTime } from "../api";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseDateTime(simDate, simTime) {
  // simDate: "YYYY-MM-DD", simTime: "HH:MM"
  let dateObj;
  if (simDate) {
    const [y, m, d] = simDate.split("-").map(Number);
    dateObj = new Date(y, m - 1, d);
  } else {
    dateObj = new Date();
  }

  const day = DAYS[dateObj.getDay()];
  const month = MONTHS[dateObj.getMonth()];
  const date = dateObj.getDate();
  const year = dateObj.getFullYear();

  let timeStr = simTime || "";
  if (!timeStr) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    timeStr = `${hh}:${mm}`;
  }

  // Format time to 12-hour
  const [hours, minutes] = timeStr.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  const formattedTime = `${h12}:${String(minutes).padStart(2, "0")} ${ampm}`;

  return {
    simDate: simDate || null,
    simTime: timeStr,
    day,
    date: `${day}, ${date} ${month} ${year}`,
    time: formattedTime,
    // Full welcome-bar string
    formatted: `${day}, ${date} ${month} ${year} · ${formattedTime}`,
  };
}

export function useSimulatedDateTime() {
  const [result, setResult] = useState(() => parseDateTime(null, null));

  useEffect(() => {
    let cancelled = false;
    fetchSimulatedDateTime().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setResult(parseDateTime(res.data.sim_date, res.data.sim_time));
      } else {
        setResult(parseDateTime(null, null));
      }
    });
    return () => { cancelled = true; };
  }, []);

  return result;
}
