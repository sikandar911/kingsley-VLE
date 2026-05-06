/**
 * Convert 24-hour format (HH:MM) to 12-hour format
 * Returns { hour: "HH", minute: "MM", period: "AM/PM" }
 */
export const convert24To12 = (time24) => {
  if (!time24 || !time24.includes(":")) {
    return { hour: "12", minute: "00", period: "AM" };
  }
  const [hours24, minutes] = time24.split(":");
  let hours = parseInt(hours24);
  const period = hours >= 12 ? "PM" : "AM";

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }

  return {
    hour: String(hours).padStart(2, "0"),
    minute: minutes,
    period,
  };
};

/**
 * Convert 12-hour format to 24-hour format (HH:MM)
 */
export const convert12To24 = (hour12, minute, period) => {
  let hours = parseInt(hour12);

  if (period === "AM" && hours === 12) {
    hours = 0;
  } else if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${minute}`;
};

/**
 * Format time string (HH:MM in 24-hour) to display format (h:MM AM/PM)
 * Example: "15:30" -> "3:30 PM"
 */
export const formatTimeDisplay = (time24) => {
  if (!time24 || !time24.includes(":")) return "—";
  const { hour, minute, period } = convert24To12(time24);
  if (!hour || !minute) return "—";
  // Remove leading zero from hour for display (e.g., "03:30 AM" -> "3:30 AM")
  const displayHour = parseInt(hour);
  return `${displayHour}:${minute} ${period}`;
};

/**
 * Format time range (both start and end times)
 * Example: "15:30" and "16:10" -> "3:30 PM - 4:10 PM"
 */
export const formatTimeRange = (startTime, endTime) => {
  const start = formatTimeDisplay(startTime);
  const end = formatTimeDisplay(endTime);
  if (start === "—" || end === "—") return "—";
  return `${start} - ${end}`;
};
