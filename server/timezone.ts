/**
 * Timezone & Datetime Utilities strictly for Asia/Kolkata (IST, UTC+05:30)
 *
 * Guarantees:
 * 1. Consistent 12-hour format throughout (e.g. "09:33 PM").
 * 2. Never displays invalid formats such as "21:33pm".
 * 3. Exact scheduling aligned to Asia/Kolkata timezone.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30 in milliseconds (19,800,000 ms)

export interface KolkataDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Get current year, month, day, hour, minute, second in Asia/Kolkata
 */
export function getKolkataNowParts(date: Date = new Date()): KolkataDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const p: Record<string, string> = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }
  return {
    year: parseInt(p.year, 10),
    month: parseInt(p.month, 10),
    day: parseInt(p.day, 10),
    hour: parseInt(p.hour, 10),
    minute: parseInt(p.minute, 10),
    second: parseInt(p.second, 10)
  };
}

/**
 * Format any timestamp or date into consistent 12-hour format in Asia/Kolkata (e.g. "09:33 PM")
 * Never displays invalid formats like "21:33pm" or single-digit hours like "9:33 PM".
 * Always "hh:mm AM|PM" with 2-digit hour and uppercase AM/PM.
 */
export function format12HourIST(dateOrTimestamp: number | Date | string): string {
  let epoch: number | null = null;
  if (typeof dateOrTimestamp === 'number') {
    epoch = isNaN(dateOrTimestamp) ? Date.now() : dateOrTimestamp;
  } else if (dateOrTimestamp instanceof Date) {
    epoch = isNaN(dateOrTimestamp.getTime()) ? Date.now() : dateOrTimestamp.getTime();
  } else if (typeof dateOrTimestamp === 'string') {
    const parsed = parseReminderTimestampIST(dateOrTimestamp);
    if (parsed !== null) {
      epoch = parsed;
    } else {
      const d = new Date(dateOrTimestamp);
      epoch = isNaN(d.getTime()) ? Date.now() : d.getTime();
    }
  } else {
    epoch = Date.now();
  }

  const k = getKolkataNowParts(new Date(epoch));
  let h = k.hour;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hourStr = String(h).padStart(2, '0');
  const minStr = String(k.minute).padStart(2, '0');
  return `${hourStr}:${minStr} ${ampm}`;
}

/**
 * Format a reminder datetime string into the clean 12-hour IST format (e.g. "09:33 PM").
 * Handles raw inputs like "21:33pm", "21:33", "09:33 PM", "9:33 PM", "2026-10-09T21:33:00", etc.
 */
export function formatScheduledDisplayIST(rawStr: string): string {
  if (!rawStr) return format12HourIST(Date.now());
  const trimmed = String(rawStr).trim();

  // If already matches "h:mm AM|PM" or "hh:mm AM|PM", normalize 2-digit hour and uppercase
  const cleanMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (cleanMatch) {
    let h = parseInt(cleanMatch[1], 10);
    const min = cleanMatch[2];
    const ampm = cleanMatch[3].toUpperCase();
    if (h > 12) {
      h = h - 12;
    }
    return `${String(h).padStart(2, '0')}:${min} ${ampm}`;
  }

  // Parse through IST parser
  const parsedEpoch = parseReminderTimestampIST(trimmed);
  if (parsedEpoch !== null) {
    return format12HourIST(parsedEpoch);
  }

  // If it has hours/minutes like "21:33pm" or "21:33"
  const m = trimmed.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ampm = m[3]?.toLowerCase();
    if (h > 12) {
      h = h - 12;
      return `${String(h).padStart(2, '0')}:${min} PM`;
    } else if (ampm === 'pm' && h < 12) {
      return `${String(h).padStart(2, '0')}:${min} PM`;
    } else if (ampm === 'am') {
      if (h === 12) h = 0;
      const displayH = h === 0 ? 12 : h;
      return `${String(displayH).padStart(2, '0')}:${min} AM`;
    } else {
      return `${String(h).padStart(2, '0')}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
    }
  }

  return format12HourIST(Date.now());
}

/**
 * Parse any user/system reminder datetime string into accurate UTC epoch timestamp in milliseconds,
 * strictly bound to Asia/Kolkata timezone.
 */
export function parseReminderTimestampIST(dtStr: string): number | null {
  if (!dtStr) return null;
  const str = String(dtStr).trim();
  const lower = str.toLowerCase();
  const now = Date.now();

  // 1. Relative seconds: "in 10 seconds", "10s", "10 sec", "10 secs", "+10s", "+10 seconds"
  const relSec =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:s|sec|seconds?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:s|sec|seconds?)/i);
  if (relSec) return now + parseInt(relSec[1], 10) * 1000;

  // 2. Relative minutes: "in 5 minutes", "5m", "5min", "5 mins", "+5m", "+5 minutes"
  const relMin =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:m|min|mins|minutes?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:m|min|mins|minutes?)/i);
  if (relMin) return now + parseInt(relMin[1], 10) * 60 * 1000;

  // 3. Relative hours: "in 2 hours", "2h", "2hr", "2hrs", "+2h", "+2 hours"
  const relHr =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:h|hr|hrs|hours?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:h|hr|hrs|hours?)/i);
  if (relHr) return now + parseInt(relHr[1], 10) * 3600 * 1000;

  // 4. Relative days: "in 1 day", "1d", "+1d", "2 days"
  const relDay =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:d|day|days?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:d|day|days?)/i);
  if (relDay) return now + parseInt(relDay[1], 10) * 86400 * 1000;

  // 5. Snooze string: "Snoozed +5m (until 09:33 PM)"
  if (lower.includes('until')) {
    const snoozeMatch = str.match(/until\s+([^\)]+)/i);
    if (snoozeMatch) {
      const sub = parseReminderTimestampIST(snoozeMatch[1].trim());
      if (sub !== null) return sub;
    }
  }

  // 6. ISO string with explicit timezone Z or offset (+05:30, -05:00)
  if (/T.*\d(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
    const parsed = new Date(str).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // 7. Full ISO / date without timezone offset:
  // e.g. "2026-10-09T21:33", "2026-10-09T21:33:00", "2026-10-09 21:33", "2026-10-09 09:33 PM", "2026-10-09"
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    let h = isoMatch[4] ? parseInt(isoMatch[4], 10) : 9; // Default 9:00 AM IST if date-only
    const min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const s = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

    // Check if there is an am/pm designation attached
    const ampmMatch = str.match(/\b(am|pm)\b/i);
    if (ampmMatch) {
      const ampm = ampmMatch[1].toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
    }

    return Date.UTC(y, m - 1, d, h, min, s) - IST_OFFSET_MS;
  }

  // 8. Time with optional day word (e.g. "Tomorrow at 9:33 PM", "Today at 21:33", "21:33pm", "09:33 PM", "9am")
  // Use bounded regex to avoid matching 4-digit years like "2026"
  const timeWithColon = str.match(/(?:at\s+|@\s*|^|\b)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const timeWithAmPm = !timeWithColon ? str.match(/(?:at\s+|@\s*|^|\b)(\d{1,2})\s*(am|pm)\b/i) : null;

  if (timeWithColon || timeWithAmPm) {
    let hrs = 0;
    let mins = 0;
    let ampm: string | null = null;

    if (timeWithColon) {
      hrs = parseInt(timeWithColon[1], 10);
      mins = parseInt(timeWithColon[2], 10);
      ampm = timeWithColon[4] ? timeWithColon[4].toLowerCase() : null;
    } else if (timeWithAmPm) {
      hrs = parseInt(timeWithAmPm[1], 10);
      mins = 0;
      ampm = timeWithAmPm[2] ? timeWithAmPm[2].toLowerCase() : null;
    }

    if (hrs > 12) {
      // Already 24-hr format (e.g. 21:33 or invalid 21:33pm) -> hrs is 21
    } else if (ampm === 'pm' && hrs < 12) {
      hrs += 12;
    } else if (ampm === 'am' && hrs === 12) {
      hrs = 0;
    }

    const isTomorrow = lower.includes('tomorrow');
    const k = getKolkataNowParts();
    let day = k.day;
    if (isTomorrow) day += 1;

    let targetEpoch = Date.UTC(k.year, k.month - 1, day, hrs, mins, 0) - IST_OFFSET_MS;

    // If standalone time without explicit date keywords, and targetEpoch is in the past by > 1 hour,
    // schedule it for tomorrow in IST
    if (!isTomorrow && !lower.includes('today') && !lower.includes('tonight') && !str.includes('-') && !str.includes('/')) {
      if (now - targetEpoch > 60 * 60 * 1000) {
        targetEpoch += 86400 * 1000;
      }
    }

    return targetEpoch;
  }

  // 9. Standard Date fallback
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
    return d.getTime();
  }

  return null;
}
