// Browser Notification and Audio Alert Manager for Nexa AI

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Check if the browser supports standard Notifications API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return Notification.permission as NotificationPermissionState;
  }
}

/**
 * Synthesizes a crisp, multi-tone chime using Web Audio API
 */
export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Harmonic chime notes: D5 (587.33Hz) -> A5 (880Hz) -> D6 (1174.66Hz)
    const notes = [
      { freq: 587.33, start: 0, duration: 0.18, gain: 0.2 },
      { freq: 880.0, start: 0.08, duration: 0.22, gain: 0.25 },
      { freq: 1174.66, start: 0.18, duration: 0.4, gain: 0.3 }
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      // Envelope
      gainNode.gain.setValueAtTime(0, now + note.start);
      gainNode.gain.linearRampToValueAtTime(note.gain, now + note.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration);
    });

    // Close context after completion
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 1500);
  } catch (e) {
    console.warn('Web Audio synthesis not allowed or supported:', e);
  }
}

export interface ShowReminderNotificationOptions {
  id: string;
  title: string;
  datetime: string;
  priority?: string;
  playSound?: boolean;
  onClick?: () => void;
}

/**
 * Display a native desktop browser notification for a reminder
 */
export function showReminderNotification(options: ShowReminderNotificationOptions): Notification | null {
  const { id, title, datetime, priority = 'high', playSound = true, onClick } = options;

  if (playSound) {
    playNotificationSound();
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const priorityIcon = priority === 'high' ? '🚨' : priority === 'medium' ? '⏰' : '📌';
    const notif = new Notification(`${priorityIcon} Nexa Reminder: ${title}`, {
      body: `Due Now (${datetime}) • Priority: ${priority.toUpperCase()}\nClick to open Nexa AI.`,
      tag: `reminder-${id}`,
      requireInteraction: true,
      silent: false
    });

    notif.onclick = () => {
      try {
        window.focus();
      } catch (e) {}
      if (onClick) onClick();
      notif.close();
    };

    return notif;
  } catch (error) {
    console.warn('Failed to construct native Notification:', error);
    return null;
  }
}

/**
 * Helper to parse various reminder datetime representations into a valid Date object
 */
export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function getKolkataNowParts(date: Date = new Date()) {
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

export function format12HourIST(dateOrTimestamp: number | Date | string): string {
  let epoch: number | null = null;
  if (typeof dateOrTimestamp === 'number') {
    epoch = isNaN(dateOrTimestamp) ? Date.now() : dateOrTimestamp;
  } else if (dateOrTimestamp instanceof Date) {
    epoch = isNaN(dateOrTimestamp.getTime()) ? Date.now() : dateOrTimestamp.getTime();
  } else if (typeof dateOrTimestamp === 'string') {
    const parsed = parseReminderDatetime(dateOrTimestamp);
    if (parsed !== null) {
      epoch = parsed.getTime();
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

export function formatScheduledDisplayIST(rawStr: string): string {
  if (!rawStr) return format12HourIST(Date.now());
  const trimmed = String(rawStr).trim();

  const cleanMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (cleanMatch) {
    let h = parseInt(cleanMatch[1], 10);
    const min = cleanMatch[2];
    const ampm = cleanMatch[3].toUpperCase();
    if (h > 12) h = h - 12;
    return `${String(h).padStart(2, '0')}:${min} ${ampm}`;
  }

  const parsed = parseReminderDatetime(trimmed);
  if (parsed !== null) {
    return format12HourIST(parsed.getTime());
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

export function parseReminderDatetime(rawDatetime: string): Date | null {
  if (!rawDatetime || typeof rawDatetime !== 'string') return null;

  const text = rawDatetime.trim();
  const lower = text.toLowerCase();
  const now = Date.now();

  // 1. Relative seconds
  const relSec =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:s|sec|seconds?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:s|sec|seconds?)/i);
  if (relSec) {
    return new Date(now + parseInt(relSec[1], 10) * 1000);
  }

  // 2. Relative minutes
  const relMin =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:m|min|mins|minutes?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:m|min|mins|minutes?)/i);
  if (relMin) {
    return new Date(now + parseInt(relMin[1], 10) * 60 * 1000);
  }

  // 3. Relative hours
  const relHr =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:h|hr|hrs|hours?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:h|hr|hrs|hours?)/i);
  if (relHr) {
    return new Date(now + parseInt(relHr[1], 10) * 3600 * 1000);
  }

  // 4. Relative days
  const relDay =
    lower.match(/^(?:in\s*)?\+?(\d+)\s*(?:d|day|days?)$/i) ||
    lower.match(/(?:in\s*|\+)(\d+)\s*(?:d|day|days?)/i);
  if (relDay) {
    return new Date(now + parseInt(relDay[1], 10) * 86400 * 1000);
  }

  // 5. Snooze string: "Snoozed +5m (until 09:33 PM)"
  if (lower.includes('until')) {
    const snoozeTimeMatch = text.match(/until\s+([^\)]+)/i);
    if (snoozeTimeMatch) {
      const sub = parseReminderDatetime(snoozeTimeMatch[1].trim());
      if (sub) return sub;
    }
  }

  // 6. ISO string with explicit timezone Z or offset
  if (/T.*\d(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const directDate = new Date(text);
    if (!isNaN(directDate.getTime())) {
      return directDate;
    }
  }

  // 7. Full ISO / date without timezone offset
  const isoMatch = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    let h = isoMatch[4] ? parseInt(isoMatch[4], 10) : 9;
    const min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const s = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

    const ampmMatch = text.match(/\b(am|pm)\b/i);
    if (ampmMatch) {
      const ampm = ampmMatch[1].toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
    }

    const epoch = Date.UTC(y, m - 1, d, h, min, s) - IST_OFFSET_MS;
    return new Date(epoch);
  }

  // 8. Time with optional day word
  const timeWithColon = text.match(/(?:at\s+|@\s*|^|\b)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const timeWithAmPm = !timeWithColon ? text.match(/(?:at\s+|@\s*|^|\b)(\d{1,2})\s*(am|pm)\b/i) : null;

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
      // 24-hour format
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

    if (!isTomorrow && !lower.includes('today') && !lower.includes('tonight') && !text.includes('-') && !text.includes('/')) {
      if (now - targetEpoch > 60 * 60 * 1000) {
        targetEpoch += 86400 * 1000;
      }
    }

    return new Date(targetEpoch);
  }

  // 9. Direct Date fallback
  const fallback = new Date(text);
  if (!isNaN(fallback.getTime()) && fallback.getFullYear() > 2000) {
    return fallback;
  }

  return null;
}
