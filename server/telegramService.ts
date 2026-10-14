import {
  Reminder,
  TelegramDispatchLog,
  TelegramNotificationSettings,
  TelegramReminderNotification
} from '../src/types';
import { db } from './db';
import { format12HourIST, formatScheduledDisplayIST } from './timezone';

export const DEFAULT_TELEGRAM_BOT_TOKEN = '8711965885:AAEtgT1w0S1NK_aH_aH_djPV_JWr0Pz5e5s';
export const DEFAULT_TELEGRAM_BOT_USERNAME = 'NexaTaskAlertsBot';
export const TELEGRAM_BOT_URL = 'https://t.me/NexaTaskAlertsBot';

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
}

export interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  message?: {
    message_id: number;
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  };
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: TelegramCallbackQuery;
}

let lastHandledUpdateId = 0;
let isPollingWorkerActive = false;

function getBotToken(token?: string): string {
  return token || process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
}

/**
 * Get info about the Telegram Bot from getMe endpoint
 */
export async function getTelegramBotInfo(token?: string): Promise<{ success: boolean; bot?: TelegramBotInfo; error?: string }> {
  const botToken = getBotToken(token);
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();
    if (data.ok && data.result) {
      return { success: true, bot: data.result };
    }
    return { success: false, error: data.description || 'Failed to authenticate with Telegram Bot API' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching Telegram API' };
  }
}

/**
 * Fetch latest updates (messages received by the bot)
 */
export async function getTelegramUpdates(token?: string): Promise<{ success: boolean; updates: TelegramUpdate[]; error?: string }> {
  const botToken = getBotToken(token);
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      return { success: true, updates: data.result };
    }
    return { success: false, updates: [], error: data.description || 'Failed to fetch updates' };
  } catch (err: any) {
    return { success: false, updates: [], error: err.message };
  }
}

/**
 * Auto-detect user Chat ID from recent messages sent to the bot
 */
export async function detectTelegramChatId(token?: string): Promise<{
  found: boolean;
  chatId?: string;
  username?: string;
  name?: string;
  recentMessages?: { text: string; date: number }[];
  allChats?: { id: string; name: string; username?: string; lastMessage?: string }[];
}> {
  const { success, updates } = await getTelegramUpdates(token);
  if (!success || updates.length === 0) {
    return { found: false, allChats: [] };
  }

  const chatsMap = new Map<string, { id: string; name: string; username?: string; lastMessage?: string; date: number }>();

  // Process updates newest first
  for (let i = updates.length - 1; i >= 0; i--) {
    const u = updates[i];
    if (u.message && u.message.chat) {
      const chatIdStr = String(u.message.chat.id);
      const name = [u.message.chat.first_name, u.message.chat.last_name].filter(Boolean).join(' ') || u.message.from?.first_name || 'User';
      const username = u.message.chat.username || u.message.from?.username;
      const text = u.message.text || '';
      const date = u.message.date;

      if (!chatsMap.has(chatIdStr)) {
        chatsMap.set(chatIdStr, { id: chatIdStr, name, username, lastMessage: text, date });
      }
    }
  }

  const allChats = Array.from(chatsMap.values());
  if (allChats.length > 0) {
    const latest = allChats[0];
    return {
      found: true,
      chatId: latest.id,
      username: latest.username,
      name: latest.name,
      allChats
    };
  }

  return { found: false, allChats: [] };
}

/**
 * Send a raw Telegram message via HTTP API
 * Note: Status is 'sent' when Telegram API accepts the message (not delivered or read).
 */
export async function sendTelegramMessage(options: {
  chatId: string | number;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: any;
  reminderId?: string;
  reminderTitle?: string;
  token?: string;
}): Promise<TelegramDispatchLog & { ok: boolean; result?: any }> {
  const { chatId, text, parseMode, replyMarkup, reminderId, reminderTitle, token } = options;
  const botToken = getBotToken(token);
  const logId = `tg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!chatId) {
    const failedLog: TelegramDispatchLog = {
      id: logId,
      reminderId,
      reminderTitle: reminderTitle || 'Telegram Alert',
      chatId: '',
      message: text,
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: 'Telegram Chat ID is not configured. Please open @NexaTaskAlertsBot and press Start or enter your Chat ID.'
    };
    db.addTelegramDispatchLog(failedLog);
    return { ...failedLog, ok: false };
  }

  try {
    const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload: Record<string, any> = {
      chat_id: chatId,
      text,
      disable_web_page_preview: false
    };
    if (parseMode) {
      payload.parse_mode = parseMode;
    }
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    let res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data = await res.json();

    // If failed due to entity parsing in Markdown/HTML, retry once cleanly without parse_mode
    if (!data.ok && parseMode) {
      delete payload.parse_mode;
      const retryRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const retryData = await retryRes.json();
      if (retryData.ok) {
        data = retryData;
      }
    }

    if (data.ok && data.result) {
      // Telegram API accepted the message (Status: 'sent' - do not claim delivered or read)
      const sentLog: TelegramDispatchLog = {
        id: logId,
        reminderId,
        reminderTitle: reminderTitle || 'Telegram Alert',
        chatId: String(chatId),
        recipientName: data.result.chat?.first_name || data.result.chat?.username || 'Telegram User',
        message: text,
        status: 'sent',
        timestamp: new Date().toISOString(),
        telegramMessageId: data.result.message_id
      };
      db.addTelegramDispatchLog(sentLog);
      return { ...sentLog, ok: true, result: data.result };
    } else {
      const failedLog: TelegramDispatchLog = {
        id: logId,
        reminderId,
        reminderTitle: reminderTitle || 'Telegram Alert',
        chatId: String(chatId),
        message: text,
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: data.description || 'Telegram API rejected message'
      };
      db.addTelegramDispatchLog(failedLog);
      return { ...failedLog, ok: false };
    }
  } catch (err: any) {
    const errorLog: TelegramDispatchLog = {
      id: logId,
      reminderId,
      reminderTitle: reminderTitle || 'Telegram Alert',
      chatId: String(chatId),
      message: text,
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: err.message || 'Network error connecting to Telegram Bot API'
    };
    db.addTelegramDispatchLog(errorLog);
    return { ...errorLog, ok: false };
  }
}

/**
 * Edit an existing message in Telegram (e.g. after user acknowledgement)
 */
export async function editTelegramMessageText(options: {
  chatId: string | number;
  messageId: number;
  text: string;
  replyMarkup?: any;
  parseMode?: 'Markdown' | 'HTML';
  token?: string;
}): Promise<{ success: boolean; result?: any; error?: string }> {
  const { chatId, messageId, text, replyMarkup, parseMode, token } = options;
  const botToken = getBotToken(token);
  try {
    const payload: Record<string, any> = {
      chat_id: chatId,
      message_id: messageId,
      text
    };
    if (replyMarkup !== undefined) {
      payload.reply_markup = replyMarkup;
    }
    if (parseMode) {
      payload.parse_mode = parseMode;
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    // Telegram returns error if message content didn't change: treat as harmless success
    if (!data.ok && data.description && data.description.includes('message is not modified')) {
      return { success: true };
    }

    return { success: !!data.ok, result: data.result, error: data.description };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Answer a callback_query event from an inline keyboard button
 */
export async function answerTelegramCallbackQuery(options: {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
  token?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { callbackQueryId, text, showAlert = false, token } = options;
  const botToken = getBotToken(token);
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert
      })
    });
    const data = await res.json();
    return { success: !!data.ok, error: data.description };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Build the exact formatted alert string according to specification:
 *
 * 🔔 NEXA AI TASK & REMINDER ALERT 🚨
 *
 * 📌 Title: Call the client
 * 📝 Task Message: Discuss the project update with the client.
 * 📍 Starting Point: Office
 * 🏁 Ending Point: Client Location
 * ⏰ Scheduled: 09:33 PM
 * ⚡ Priority: HIGH
 * 🕒 Triggered At: 09:33 PM
 *
 * ✨ Sent automatically by your Nexa AI Personal Productivity Assistant.
 * 🤖 Bot: @NexaTaskAlertsBot
 */
export function buildTelegramAlertMessage(options: {
  title: string;
  taskMessage?: string;
  startingPoint?: string;
  endingPoint?: string;
  scheduledTime: string; // 12-hour format e.g. "09:33 PM"
  priority: string; // e.g. "HIGH"
  triggeredTime: string; // 12-hour format e.g. "09:33 PM"
  botUsername?: string;
}): string {
  const {
    title,
    taskMessage,
    startingPoint,
    endingPoint,
    scheduledTime,
    priority,
    triggeredTime,
    botUsername = DEFAULT_TELEGRAM_BOT_USERNAME
  } = options;

  const lines: string[] = [
    '🔔 NEXA AI TASK & REMINDER ALERT 🚨',
    '',
    `📌 Title: ${title.trim()}`
  ];

  // Include task message or description if present
  const cleanMessage = taskMessage ? taskMessage.trim() : '';
  if (cleanMessage) {
    lines.push(`📝 Task Message: ${cleanMessage}`);
  }

  // Handle task locations correctly:
  // - If only starting point: display only starting point
  // - If both starting point and ending point: display both
  // - If neither: hide both
  // - Never display empty, undefined, or null values
  const cleanStart = startingPoint ? startingPoint.trim() : '';
  const cleanEnd = endingPoint ? endingPoint.trim() : '';

  if (cleanStart) {
    lines.push(`📍 Starting Point: ${cleanStart}`);
  }
  if (cleanEnd) {
    lines.push(`🏁 Ending Point: ${cleanEnd}`);
  }

  lines.push(`⏰ Scheduled: ${scheduledTime}`);
  lines.push(`⚡ Priority: ${priority.toUpperCase()}`);
  lines.push(`🕒 Triggered At: ${triggeredTime}`);
  lines.push('');
  lines.push('✨ Sent automatically by your Nexa AI Personal Productivity Assistant.');
  lines.push(`🤖 Bot: @${botUsername}`);

  return lines.join('\n');
}

/**
 * Dispatch an automated reminder alert formatted specifically for Telegram
 * Includes inline button "✅ Seen / Acknowledge" and persists a TelegramReminderNotification record.
 */
export async function dispatchReminderTelegramAlert(
  reminder: Reminder,
  customSettings?: TelegramNotificationSettings
): Promise<{ log: TelegramDispatchLog; notification: TelegramReminderNotification; success: boolean }> {
  const settings = customSettings || db.getSettings().telegramSettings || {
    enabled: true,
    botToken: getBotToken(),
    botUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
    chatId: '',
    autoAlertOnDue: true
  };

  const targetChatId = String(reminder.telegramChatId || settings.chatId || '');

  // Resolve linked task if applicable
  const linkedTask = reminder.relatedId
    ? db.getTasks().find((t) => t.id === reminder.relatedId)
    : null;

  const title = (reminder.title || linkedTask?.title || 'Scheduled Reminder').trim();

  // Task message / description (display separately, handle missing gracefully)
  const rawMessage = reminder.message || reminder.description || linkedTask?.message || linkedTask?.description || '';
  const taskMessage = rawMessage ? rawMessage.trim() : '';

  // Task locations (display only those provided, never empty/undefined/null)
  const rawStart = reminder.startingPoint || reminder.startLocation || linkedTask?.startingPoint || linkedTask?.startLocation || '';
  const rawEnd = reminder.endingPoint || reminder.endLocation || linkedTask?.endingPoint || linkedTask?.endLocation || '';
  const startingPoint = rawStart ? rawStart.trim() : '';
  const endingPoint = rawEnd ? rawEnd.trim() : '';

  // Calculate actual triggered time right now in Asia/Kolkata (12-hour format e.g. "09:33 PM")
  const now = Date.now();
  const triggeredTimeStr = format12HourIST(now);

  // Scheduled time in Asia/Kolkata (consistent 12-hour format e.g. "09:33 PM")
  let scheduledTimeStr: string;
  if (reminder.snoozedUntil) {
    scheduledTimeStr = formatScheduledDisplayIST(reminder.snoozedUntil);
  } else if (reminder.scheduledEpoch) {
    scheduledTimeStr = format12HourIST(reminder.scheduledEpoch);
  } else {
    scheduledTimeStr = formatScheduledDisplayIST(reminder.datetime);
  }

  const priority = (reminder.priority || linkedTask?.priority || 'high').toUpperCase();

  // 1. Create unique notification record with status 'pending'
  const notificationId = `notif_tg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const initialNotification: TelegramReminderNotification = {
    id: notificationId,
    reminderId: reminder.id,
    taskId: linkedTask?.id || reminder.relatedId || reminder.id,
    taskTitle: title,
    taskMessage: taskMessage || undefined,
    startingPoint: startingPoint || undefined,
    endingPoint: endingPoint || undefined,
    priority,
    scheduledTime: scheduledTimeStr,
    triggeredTime: triggeredTimeStr,
    chatId: targetChatId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.createTelegramNotification(initialNotification);

  const telegramMessage = buildTelegramAlertMessage({
    title,
    taskMessage: taskMessage || undefined,
    startingPoint: startingPoint || undefined,
    endingPoint: endingPoint || undefined,
    scheduledTime: scheduledTimeStr,
    priority,
    triggeredTime: triggeredTimeStr,
    botUsername: settings.botUsername || DEFAULT_TELEGRAM_BOT_USERNAME
  });

  // 2. Attach inline button "✅ Seen / Acknowledge"
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '✅ Seen / Acknowledge',
          callback_data: `ack:${notificationId}`
        }
      ]
    ]
  };

  const logResult = await sendTelegramMessage({
    chatId: targetChatId,
    text: telegramMessage,
    replyMarkup,
    reminderId: reminder.id,
    reminderTitle: title,
    token: settings.botToken || getBotToken()
  });

  // 3. Update notification record status based on Telegram API response
  let updatedNotification: TelegramReminderNotification;
  if (logResult.ok && logResult.telegramMessageId) {
    const sentTime = format12HourIST(Date.now());
    updatedNotification = db.updateTelegramNotification(notificationId, {
      status: 'sent',
      telegramMessageId: logResult.telegramMessageId,
      sentAt: new Date().toISOString(),
      sentTimestamp: sentTime
    }) || initialNotification;
  } else {
    updatedNotification = db.updateTelegramNotification(notificationId, {
      status: 'failed',
      errorMessage: logResult.error || 'Failed to dispatch via Telegram API'
    }) || initialNotification;
  }

  return {
    log: logResult,
    notification: updatedNotification,
    success: updatedNotification.status === 'sent'
  };
}

/**
 * Handle Telegram callback_query events (e.g. user clicks "✅ Seen / Acknowledge")
 */
export async function handleTelegramCallbackQuery(
  callbackQuery: TelegramCallbackQuery,
  token?: string
): Promise<{ success: boolean; message?: string }> {
  const botToken = getBotToken(token);
  const queryId = callbackQuery?.id;
  const data = callbackQuery?.data || '';
  const fromUser = callbackQuery?.from || { id: 0, is_bot: false, first_name: 'User' };
  const msg = callbackQuery?.message;
  const chatId = msg?.chat?.id || fromUser.id;
  const messageId = msg?.message_id;

  if (!queryId) return { success: false, message: 'Missing callback query ID' };

  // Check prefix: ack:<notificationId> or ack_done:<notificationId>
  const isAck = data.startsWith('ack:');
  const isAlreadyAck = data.startsWith('ack_done:');

  if (!isAck && !isAlreadyAck) {
    await answerTelegramCallbackQuery({
      callbackQueryId: queryId,
      text: 'Action processed.',
      token: botToken
    });
    return { success: true };
  }

  const notificationId = data.replace(/^ack(_done)?:/, '').trim();
  const notification = db.getTelegramNotificationById(notificationId);

  if (!notification) {
    await answerTelegramCallbackQuery({
      callbackQueryId: queryId,
      text: '⚠️ Reminder notification record not found or expired.',
      showAlert: true,
      token: botToken
    });
    return { success: false, message: 'Notification not found' };
  }

  // Validate authorization:
  // Ensure the acknowledging chat/user ID matches the notification's target or configured settings
  const settings = db.getSettings().telegramSettings;
  const allowedChatId = String(notification.chatId || settings?.chatId || '').trim();
  const currentChatId = String(chatId).trim();
  const currentUserId = String(fromUser.id || '').trim();

  const isAuthorized =
    !allowedChatId ||
    currentChatId === allowedChatId ||
    currentUserId === allowedChatId ||
    (settings?.telegramUsername &&
      fromUser.username &&
      fromUser.username.toLowerCase() === settings.telegramUsername.toLowerCase().replace('@', ''));

  if (!isAuthorized) {
    console.warn(
      `[Nexa AI Telegram Bot] ⛔ Unauthorized acknowledgement attempt by user ${fromUser.id} (${fromUser.username}) for notification ${notificationId}`
    );
    await answerTelegramCallbackQuery({
      callbackQueryId: queryId,
      text: '⛔ Unauthorized: This reminder belongs to another Nexa AI user.',
      showAlert: true,
      token: botToken
    });
    return { success: false, message: 'Unauthorized' };
  }

  // Handle repeated taps safely if already acknowledged
  if (notification.status === 'acknowledged' || isAlreadyAck) {
    const ackTime = notification.acknowledgedTime || 'earlier';
    await answerTelegramCallbackQuery({
      callbackQueryId: queryId,
      text: `ℹ️ Already acknowledged at ${ackTime}. No duplicate action taken.`,
      showAlert: false,
      token: botToken
    });
    return { success: true, message: 'Already acknowledged' };
  }

  // Process acknowledgement
  const now = Date.now();
  const ackTimeIST = format12HourIST(now);
  const ackIso = new Date(now).toISOString();

  // 1. Update database notification status to Acknowledged
  const updatedNotification = db.updateTelegramNotification(notification.id, {
    status: 'acknowledged',
    acknowledgedAt: ackIso,
    acknowledgedTime: ackTimeIST,
    acknowledgedBy: {
      userId: fromUser.id,
      username: fromUser.username,
      firstName: fromUser.first_name
    }
  });

  // 2. Also update corresponding Telegram dispatch log if found
  const logs = db.getTelegramDispatchLogs();
  const relatedLog = logs.find(
    (l) =>
      l.reminderId === notification.reminderId ||
      (notification.telegramMessageId && l.telegramMessageId === notification.telegramMessageId)
  );
  if (relatedLog) {
    relatedLog.status = 'acknowledged';
    relatedLog.acknowledgedAt = ackIso;
  }

  // 3. Answer Telegram callback query with feedback toast
  await answerTelegramCallbackQuery({
    callbackQueryId: queryId,
    text: `✅ Reminder Acknowledged at ${ackTimeIST}!`,
    showAlert: false,
    token: botToken
  });

  // 4. Edit original message in Telegram to show "✅ Acknowledged" and acknowledgement time
  if (chatId && messageId) {
    const originalText = msg?.text || '';
    const userNameDisplay =
      [fromUser.first_name, fromUser.last_name].filter(Boolean).join(' ') ||
      fromUser.username ||
      'User';

    let updatedText = originalText;
    if (!updatedText.includes('✅ Acknowledged')) {
      const footerMarker = '✨ Sent automatically';
      if (updatedText.includes(footerMarker)) {
        const parts = updatedText.split(footerMarker);
        updatedText = `${parts[0].trim()}\n\n✅ Acknowledged: ${ackTimeIST}\n👤 Confirmed by: ${userNameDisplay}\n\n${footerMarker}${parts[1]}`;
      } else {
        updatedText = `${updatedText.trim()}\n\n✅ Acknowledged: ${ackTimeIST}\n👤 Confirmed by: ${userNameDisplay}`;
      }
    }

    // Update button to show acknowledged state
    await editTelegramMessageText({
      chatId,
      messageId,
      text: updatedText,
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: `✅ Acknowledged (${ackTimeIST})`,
              callback_data: `ack_done:${notification.id}`
            }
          ]
        ]
      },
      token: botToken
    });
  }

  // 5. In-app notification & audit trail
  db.addNotification({
    title: `✅ Telegram Reminder Acknowledged`,
    message: `User acknowledged "${notification.taskTitle}" on Telegram at ${ackTimeIST}.`,
    type: 'reminder',
    link: '/dashboard'
  });

  db.addActionHistory({
    action: `Telegram Reminder Acknowledged (@${settings?.botUsername || DEFAULT_TELEGRAM_BOT_USERNAME})`,
    category: 'reminder',
    details: `Confirmed by ${fromUser.first_name || 'User'} (${chatId}) at ${ackTimeIST} for "${notification.taskTitle}"`,
    status: 'success',
    meta: {
      notificationId: notification.id,
      reminderId: notification.reminderId,
      acknowledgedTime: ackTimeIST,
      chatId
    }
  });

  console.log(
    `[Nexa AI Telegram Bot] 🎯 Successfully recorded acknowledgement for "${notification.taskTitle}" at ${ackTimeIST}`
  );

  return { success: true, message: 'Acknowledged' };
}

/**
 * Handle incoming user commands like /start, /help, /tasks, etc.
 */
export async function handleTelegramIncomingMessage(msg: NonNullable<TelegramUpdate['message']>, token?: string) {
  const botToken = getBotToken(token);
  if (!msg || !msg.text || !msg.chat) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const userName = [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(' ') || 'there';

  console.log(`[Nexa AI Telegram Bot] 📩 Incoming message from ${userName} (${chatId}): "${text}"`);

  // Auto-link chat ID into settings if needed
  const currentSettings = db.getSettings().telegramSettings;
  if (!currentSettings?.chatId || text.startsWith('/start') || text.startsWith('/link')) {
    db.updateSettings({
      telegramSettings: {
        ...(currentSettings || {
          enabled: true,
          botToken: getBotToken(),
          botUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
          chatId: String(chatId),
          autoAlertOnDue: true
        }),
        chatId: String(chatId),
        telegramUsername: msg.chat.username || '',
        lastActiveAt: new Date().toISOString()
      }
    });
  }

  // Handle commands
  if (text.startsWith('/start') || text.startsWith('/help')) {
    const welcomeReply =
      `👋 *Hello ${userName}! Welcome to Nexa AI Alerts.*\n\n` +
      `✅ *Connected Successfully!*\n` +
      `Your Telegram Chat ID is: \`${chatId}\`\n\n` +
      `From now on, all your scheduled Nexa AI task deadlines and reminder alerts will be delivered right to this conversation instantly with interactive user acknowledgement! 🚀\n\n` +
      `*Available Bot Commands:*\n` +
      `• /tasks — View your current pending tasks\n` +
      `• /reminders — View your upcoming reminders\n` +
      `• /chatid — Display your unique Telegram Chat ID\n` +
      `• /status — Check Nexa AI Assistant link status`;

    await sendTelegramMessage({
      chatId,
      text: welcomeReply,
      parseMode: 'Markdown',
      token: botToken
    });
  } else if (text.startsWith('/chatid')) {
    await sendTelegramMessage({
      chatId,
      text: `🆔 *Your Telegram Chat ID:* \`${chatId}\`\nThis ID is linked to your Nexa AI Personal Assistant.`,
      parseMode: 'Markdown',
      token: botToken
    });
  } else if (text.startsWith('/tasks')) {
    const tasks = db.getTasks().filter((t) => t.status !== 'completed').slice(0, 5);
    let taskReply = `📋 *Your Current Nexa AI Tasks (${tasks.length}):*\n\n`;
    if (tasks.length === 0) {
      taskReply += `🎉 You have no pending tasks! Great job!`;
    } else {
      tasks.forEach((t, i) => {
        const pEmoji = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
        taskReply += `${i + 1}. ${pEmoji} *${t.title}* (Due: ${t.dueDate})\n`;
      });
    }
    await sendTelegramMessage({
      chatId,
      text: taskReply,
      parseMode: 'Markdown',
      token: botToken
    });
  } else if (text.startsWith('/reminders')) {
    const rems = db.getReminders().filter((r) => !r.completed).slice(0, 5);
    let remReply = `⏰ *Upcoming Nexa AI Reminders (${rems.length}):*\n\n`;
    if (rems.length === 0) {
      remReply += `No upcoming reminders scheduled.`;
    } else {
      rems.forEach((r, i) => {
        remReply += `${i + 1}. 🔔 *${r.title}*\n   📅 Time: \`${r.datetime}\`\n`;
      });
    }
    await sendTelegramMessage({
      chatId,
      text: remReply,
      parseMode: 'Markdown',
      token: botToken
    });
  } else if (text.startsWith('/status')) {
    await sendTelegramMessage({
      chatId,
      text: `🟢 *Nexa AI System Status: ONLINE*\n\n• Bot: @${DEFAULT_TELEGRAM_BOT_USERNAME}\n• Chat ID: \`${chatId}\`\n• Instant Alert Dispatch: Active\n• Interactive Acknowledgement: Enabled\n• Real-Time Scheduler: Running`,
      parseMode: 'Markdown',
      token: botToken
    });
  }
}

/**
 * Handle updates received via Telegram Webhook (POST /api/telegram/webhook)
 */
export async function handleTelegramWebhookUpdate(update: any, token?: string): Promise<{ handled: boolean; action?: string }> {
  if (!update) return { handled: false };

  if (update.callback_query) {
    await handleTelegramCallbackQuery(update.callback_query, token);
    return { handled: true, action: 'callback_query' };
  }

  if (update.message) {
    await handleTelegramIncomingMessage(update.message, token);
    return { handled: true, action: 'message' };
  }

  return { handled: true };
}

/**
 * Configure Telegram Webhook URL
 */
export async function setTelegramWebhook(webhookUrl: string, token?: string) {
  const botToken = getBotToken(token);
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false
      })
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Delete Telegram Webhook URL (switches back to getUpdates long-polling)
 */
export async function deleteTelegramWebhook(token?: string) {
  const botToken = getBotToken(token);
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
      method: 'POST'
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Check Telegram Webhook info
 */
export async function getTelegramWebhookInfo(token?: string) {
  const botToken = getBotToken(token);
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Background auto-responder daemon:
 * Listens for user interactions on the Telegram Bot (@NexaTaskAlertsBot).
 * Handles messages & callback_query (Seen / Acknowledge button clicks).
 * Prevents running duplicate background listeners.
 */
export function startTelegramPollingWorker() {
  if (isPollingWorkerActive) {
    console.log(`[Nexa AI Telegram Bot] Polling listener already running. Skipping duplicate initiation.`);
    return;
  }
  isPollingWorkerActive = true;
  console.log(`[Nexa AI Telegram Bot] 🤖 Initializing background listener for @${DEFAULT_TELEGRAM_BOT_USERNAME}...`);

  setInterval(async () => {
    try {
      const settings = db.getSettings().telegramSettings;
      const botToken = settings?.botToken || getBotToken();

      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastHandledUpdateId + 1}&timeout=0`
      );
      const data = await res.json();

      // If webhook is active, Telegram getUpdates returns 409 Conflict. That's expected when using webhooks.
      if (!data.ok || !Array.isArray(data.result) || data.result.length === 0) {
        return;
      }

      for (const update of data.result as TelegramUpdate[]) {
        if (update.update_id > lastHandledUpdateId) {
          lastHandledUpdateId = update.update_id;
        }

        // 1. Handle inline button callback query ("✅ Seen / Acknowledge")
        if (update.callback_query) {
          await handleTelegramCallbackQuery(update.callback_query, botToken);
          continue;
        }

        // 2. Handle standard message commands
        if (update.message) {
          await handleTelegramIncomingMessage(update.message, botToken);
        }
      }
    } catch (err: any) {
      // Quiet background polling error handler
    }
  }, 3500);
}
