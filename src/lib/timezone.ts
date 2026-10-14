/**
 * Client-Side Timezone & Datetime Utilities for Asia/Kolkata (IST, UTC+05:30)
 */

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export interface KolkataDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

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
 */
export function format12HourIST(dateOrTimestamp: number | Date | string): string {
  const d = typeof dateOrTimestamp === 'number'
    ? new Date(dateOrTimestamp)
    : dateOrTimestamp instanceof Date
    ? dateOrTimestamp
    : new Date(dateOrTimestamp);

  if (isNaN(d.getTime())) {
    if (typeof dateOrTimestamp === 'string') {
      const parsed = parseReminderTimestampIST(dateOrTimestamp);
      if (parsed !== null) {
        return format12HourIST(parsed);
      }
    }
    return '12:00 PM';
  }

  return d.toLocaleTimeString('en-US', {
    timeZone: IST_TIMEZONE,
    hour12: true,
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Cleanly format reminder datetime for UI display
 */
export function formatScheduledDisplayIST(rawStr: string): string {
  if (!rawStr) return format12HourIST(Date.now());
  const trimmed = String(rawStr).trim();

  if (/^\d{2}:\d{2}\s+(AM|PM)$/i.test(trimmed)) {
    const parts = trimmed.split(' ');
    return `${parts[0]} ${parts[1].toUpperCase()}`;
  }

  const parsedEpoch = parseReminderTimestampIST(trimmed);
  if (parsedEpoch !== null) {
    return format12HourIST(parsedEpoch);
  }

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
    } else if (ampm === 'am' || (!ampm && h <= 12)) {
      return `${String(h).padStart(2, '0')}:${min} AM`;
    }
  }

  return format12HourIST(Date.now());
}

/**
 * Parse any datetime input into UTC epoch milliseconds bound to Asia/Kolkata
 */
export function parseReminderTimestampIST(dtStr: string): number | null {
  if (!dtStr) return null;
  const str = String(dtStr).trim();
  const lower = str.toLowerCase();
  const now = Date.now();

  // 1. Relative seconds
  const relSec =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:s|sec|seconds?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:s|sec|seconds?)/i);
  if (relSec) return now + parseInt(relSec[1], 10) * 1000;

  // 2. Relative minutes
  const relMin =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:m|min|mins|minutes?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:m|min|mins|minutes?)/i);
  if (relMin) return now + parseInt(relMin[1], 10) * 60 * 1000;

  // 3. Relative hours
  const relHr =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:h|hr|hrs|hours?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:h|hr|hrs|hours?)/i);
  if (relHr) return now + parseInt(relHr[1], 10) * 3600 * 1000;

  // 4. Relative days
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

  // 6. ISO string with explicit timezone Z or offset
  if (/T.*\d(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
    const parsed = new Date(str).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // 7. Full ISO / date without timezone offset
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    let h = parseInt(isoMatch[4], 10);
    const min = parseInt(isoMatch[5], 10);
    const s = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

    const ampmMatch = str.match(/\b(am|pm)\b/i);
    if (ampmMatch) {
      const ampm = ampmMatch[1].toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
    }

    return Date.UTC(y, m - 1, d, h, min, s) - IST_OFFSET_MS;
  }

  // 8. Time with optional day word
  const timeMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hrs = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (hrs > 12) {
      // 24-hr time
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
