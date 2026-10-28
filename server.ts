import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, verifyAuthToken, createAuthToken, defaultTelegramSettings } from './server/db';
import {
  processChat,
  generateAIEmail,
  generateTaskBreakdown,
  suggestFreeSchedule
} from './server/ai';
import {
  sendWhatsAppMessage,
  sendSMSMessage,
  dispatchReminderPhoneAlert,
  generateWhatsAppLink,
  generateSmsLink,
  sanitizePhoneNumber
} from './server/phoneService';
import {
  format12HourIST,
  formatScheduledDisplayIST,
  parseReminderTimestampIST
} from './server/timezone';
import {
  sendTelegramMessage,
  dispatchReminderTelegramAlert,
  detectTelegramChatId,
  getTelegramBotInfo,
  startTelegramPollingWorker,
  buildTelegramAlertMessage,
  handleTelegramCallbackQuery,
  handleTelegramWebhookUpdate,
  setTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramWebhookInfo,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_URL
} from './server/telegramService';
import { TelegramReminderNotification } from './src/types';

// Unified export referencing IST parser
export const parseReminderTimestamp = parseReminderTimestampIST;

// Background Worker: Checks due reminders every 1 second and auto-dispatches Telegram alerts
const inFlightDispatches = new Set<string>();

function startReminderScheduler() {
  setInterval(async () => {
    try {
      const reminders = db.getReminders();
      const settings = db.getSettings();
      const telegramSettings = settings.telegramSettings;
      const now = Date.now();

      for (const rem of reminders) {
        if (rem.completed) continue;
        // Strict single alert check: skip if already dispatched or currently in flight
        if (rem.telegramDispatched) continue;
        if (inFlightDispatches.has(rem.id)) continue;

        // Scheduled time strictly bound to Asia/Kolkata (IST)
        let scheduledTime: number | null = rem.scheduledEpoch || null;
        if (rem.snoozedUntil) {
          scheduledTime = rem.snoozedUntilEpoch || parseReminderTimestampIST(rem.snoozedUntil);
        } else if (!scheduledTime) {
          scheduledTime = parseReminderTimestampIST(rem.datetime);
        }

        if (scheduledTime === null) continue;

        // Do not trigger reminders before their scheduled time!
        if (scheduledTime <= now) {
          inFlightDispatches.add(rem.id);

          console.log(`[Nexa AI Scheduler] ⏰ Reminder "${rem.title}" is due! Scheduled: ${format12HourIST(scheduledTime)}, Triggered At: ${format12HourIST(now)}`);

          // Mark reminder as dispatched immediately to prevent any duplicate triggers
          db.updateReminder(rem.id, {
            phoneDispatched: true,
            telegramDispatched: true,
            dispatchedAt: new Date().toISOString(),
            dispatchedChannels: ['telegram']
          });

          try {
            // Dispatch Telegram Alert via @NexaTaskAlertsBot with interactive acknowledgement tracking
            let tgResult: { success: boolean; log: any; notification: TelegramReminderNotification } | null = null;
            const reminderUserSettings = db.getSettings(rem.userId);
            const effectiveTelegramSettings = reminderUserSettings.telegramSettings || telegramSettings;
            if (effectiveTelegramSettings && effectiveTelegramSettings.enabled !== false) {
              tgResult = await dispatchReminderTelegramAlert(rem, effectiveTelegramSettings);
            }

            const tgTarget = effectiveTelegramSettings?.chatId ? `Chat ID ${effectiveTelegramSettings.chatId}` : `@${DEFAULT_TELEGRAM_BOT_USERNAME}`;
            db.addNotification({
              title: `✈️ Telegram Reminder Alert Sent`,
              message: `Dispatched reminder "${rem.title}" to Telegram (@${DEFAULT_TELEGRAM_BOT_USERNAME}). Awaiting user acknowledgement.`,
              type: 'reminder',
              link: '/dashboard'
            });

            db.addActionHistory({
              action: `Telegram Reminder Alert (@${DEFAULT_TELEGRAM_BOT_USERNAME})`,
              category: 'reminder',
              details: `Auto-sent Telegram alert to ${tgTarget} for "${rem.title}" (Status: ${tgResult?.notification?.status || 'sent'})`,
              status: tgResult?.success ? 'success' : 'failed',
              meta: {
                reminderId: rem.id,
                notificationId: tgResult?.notification?.id,
                channels: ['telegram'],
                status: tgResult?.notification?.status,
                logId: tgResult?.log?.id
              }
            });
          } catch (dispatchErr) {
            console.error(`[Nexa AI Scheduler] Failed dispatching alert for ${rem.id}:`, dispatchErr);
          } finally {
            inFlightDispatches.delete(rem.id);
          }
        }
      }
    } catch (err) {
      console.error('[Nexa AI Scheduler] Error checking reminders:', err);
    }
  }, 1000);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Start background reminder scheduler
  startReminderScheduler();

  // Start Telegram bot listener
  startTelegramPollingWorker();

  // --- AUTH MIDDLEWARE (Extracts Bearer token or x-user-id header) ---
  app.use((req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    let userId: string | null = null;
    let user: any = null;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const verified = verifyAuthToken(token);
      if (verified && verified.userId) {
        userId = verified.userId;
        user = db.getUserById(userId);
      }
    }

    if (!userId && req.headers['x-user-id']) {
      const headerId = String(req.headers['x-user-id']);
      const foundUser = db.getUserById(headerId);
      if (foundUser) {
        userId = foundUser.id;
        user = foundUser;
      }
    }

    if (!userId || !user) {
      user = db.getUser();
      userId = user.id;
    }

    req.userId = userId;
    req.currentUser = user;
    next();
  });

  // --- AUTH ENDPOINTS ---
  app.get('/api/auth/me', (req: any, res) => {
    const user = req.currentUser || db.getUser(req.userId);
    res.json({ success: true, user });
  });

  app.post('/api/auth/register', (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      const result = db.registerUser(name, email, password, role);
      res.json({
        success: true,
        user: result.user,
        token: result.token,
        message: `Account created successfully. Welcome, ${result.user.name}!`
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      const result = db.loginUser(email, password);
      res.json({
        success: true,
        user: result.user,
        token: result.token,
        message: `Welcome back, ${result.user.name}!`
      });
    } catch (err: any) {
      res.status(401).json({ success: false, error: err.message || 'Invalid credentials' });
    }
  });

  app.post('/api/auth/demo', (_req, res) => {
    try {
      const result = db.loginDemoUser();
      res.json({
        success: true,
        user: result.user,
        token: result.token,
        message: 'Logged in as Demo User (Saniya)'
      });
    } catch (err: any) {
      const user = db.getUser();
      res.json({
        success: true,
        user,
        token: createAuthToken(user),
        message: 'Logged in as Demo User (Saniya)'
      });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.get('/api/auth/google-config', (_req, res) => {
    res.json({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
      configured: true
    });
  });

  // --- TASKS ENDPOINTS (SEPARATE PER USER) ---
  app.get('/api/tasks', (req: any, res) => {
    res.json(db.getTasks(req.userId));
  });

  app.post('/api/tasks', (req: any, res) => {
    const {
      title,
      description,
      message,
      startingPoint,
      startLocation,
      endingPoint,
      endLocation,
      priority,
      dueDate,
      tags,
      status,
      subtasks
    } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    const cleanMsg = message || description || '';
    const cleanStart = startingPoint || startLocation;
    const cleanEnd = endingPoint || endLocation;

    const task = db.createTask({
      title: title.trim(),
      description: cleanMsg,
      message: cleanMsg,
      startingPoint: cleanStart,
      startLocation: cleanStart,
      endingPoint: cleanEnd,
      endLocation: cleanEnd,
      priority: priority || 'high',
      status: status || 'todo',
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      tags: tags || [],
      subtasks: subtasks || []
    }, req.userId);
    res.json(task);
  });

  app.put('/api/tasks/:id', (req, res) => {
    const updated = db.updateTask(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const success = db.deleteTask(req.params.id);
    res.json({ success });
  });

  app.post('/api/tasks/:id/complete', (req, res) => {
    const updated = db.updateTask(req.params.id, { status: 'completed' });
    res.json({ success: !!updated, task: updated });
  });

  // --- EMAILS ENDPOINTS ---
  app.get('/api/emails', (req, res) => {
    res.json(db.getEmails());
  });

  app.post('/api/emails', (req, res) => {
    const { recipientEmail, subject, body, cc, bcc, folder, attachments } = req.body;
    if (!recipientEmail || !subject) {
      res.status(400).json({ error: 'Recipient email and subject required' });
      return;
    }
    const email = db.createEmail({
      senderName: db.getUser().name,
      senderEmail: db.getUser().email,
      recipientEmail,
      subject,
      body: body || '',
      cc,
      bcc,
      folder: folder || 'sent',
      attachments
    });

    // Real-Time Auto Response Engine:
    // When an email is sent out, simulate real-time recipient reply after 5 seconds
    if (email.folder === 'sent' && recipientEmail) {
      setTimeout(async () => {
        try {
          const rawName = recipientEmail.split('@')[0].replace(/[._-]/g, ' ');
          const recipientName = rawName.replace(/\b\w/g, (l) => l.toUpperCase()) || 'Recipient';
          let replyBody = `Hi ${db.getUser().name},\n\nThank you for reaching out regarding "${subject}". I have received your email and reviewed the details. Everything is set on my end!\n\nBest regards,\n${recipientName}`;

          try {
            const aiRes = await generateAIEmail(
              `Write a polite, professional 2-sentence confirmation reply acknowledging the message with subject "${subject}"`,
              'generate',
              body
            );
            if (aiRes && aiRes.body) {
              replyBody = aiRes.body;
            }
          } catch (err) {
            // fallback used
          }

          db.createEmail({
            senderName: recipientName,
            senderEmail: recipientEmail,
            recipientEmail: db.getUser().email,
            subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
            body: replyBody,
            folder: 'inbox',
            attachments: []
          });
        } catch (e) {
          console.error('Real-time email auto-reply failed:', e);
        }
      }, 5000);
    }

    res.json(email);
  });

  app.post('/api/emails/simulate-incoming', async (req, res) => {
    const senders = [
      { name: 'Dr. Sarah Lin', email: 'sarah.lin@ai-labs.org', subject: 'Updated AI Research Collaboration Notes' },
      { name: 'Client Success Team', email: 'support@cloudtech.io', subject: 'Real-Time Integration Complete' },
      { name: 'Google Cloud Platform', email: 'no-reply@cloud.google.com', subject: 'Deployment Status: All Systems Operational' }
    ];

    const pick = senders[Math.floor(Math.random() * senders.length)];
    const newMail = db.createEmail({
      senderName: pick.name,
      senderEmail: pick.email,
      recipientEmail: db.getUser().email,
      subject: pick.subject,
      body: `Hello Saniya,\n\nThis is an automated real-time test transmission verifying instant email delivery to your inbox.\n\nTimestamp: ${new Date().toLocaleTimeString()}`,
      folder: 'inbox'
    });

    res.json({ success: true, email: newMail });
  });

  app.put('/api/emails/:id', (req, res) => {
    const updated = db.updateEmail(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/emails/:id', (req, res) => {
    const success = db.deleteEmail(req.params.id);
    res.json({ success });
  });

  // --- CALENDAR EVENTS ENDPOINTS ---
  app.get('/api/calendar', (req, res) => {
    res.json(db.getEvents());
  });

  app.post('/api/calendar', (req, res) => {
    const { title, date, startTime, endTime, attendees, location, description, color, reminderMinutesBefore } = req.body;
    if (!title || !date || !startTime) {
      res.status(400).json({ error: 'Title, date, and startTime are required' });
      return;
    }
    const event = db.createEvent({
      title,
      date,
      startTime,
      endTime: endTime || startTime,
      attendees: attendees || [],
      location: location || '',
      description: description || '',
      color: color || '#3B82F6',
      reminderMinutesBefore: reminderMinutesBefore || 15
    });
    res.json(event);
  });

  app.put('/api/calendar/:id', (req, res) => {
    const updated = db.updateEvent(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Calendar event not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/calendar/:id', (req, res) => {
    const success = db.deleteEvent(req.params.id);
    res.json({ success });
  });

  // --- REMINDERS ENDPOINTS (SEPARATE PER USER) ---
  app.get('/api/reminders', (req: any, res) => {
    res.json(db.getReminders(req.userId));
  });

  app.post('/api/reminders', (req: any, res) => {
    const {
      title,
      datetime,
      priority,
      relatedType,
      relatedId,
      description,
      message,
      startingPoint,
      startLocation,
      endingPoint,
      endLocation,
      sendTelegram,
      telegramChatId
    } = req.body;

    if (!title || !datetime) {
      res.status(400).json({ error: 'Title and datetime required' });
      return;
    }

    const scheduledEpoch = parseReminderTimestampIST(datetime) || Date.now();
    const cleanStart = startingPoint || startLocation;
    const cleanEnd = endingPoint || endLocation;
    const cleanMsg = message || description;

    const reminder = db.createReminder({
      title: title.trim(),
      datetime,
      scheduledEpoch,
      priority: priority || 'high',
      relatedType,
      relatedId,
      description: cleanMsg,
      message: cleanMsg,
      startingPoint: cleanStart,
      startLocation: cleanStart,
      endingPoint: cleanEnd,
      endLocation: cleanEnd,
      sendTelegram: sendTelegram !== undefined ? sendTelegram : true,
      telegramChatId
    }, req.userId);
    res.json(reminder);
  });

  app.put('/api/reminders/:id', (req, res) => {
    const updated = db.updateReminder(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/reminders/:id', (req, res) => {
    const success = db.deleteReminder(req.params.id);
    res.json({ success });
  });

  // Force instant dispatch of a specific reminder
  app.post('/api/reminders/:id/dispatch-now', async (req, res) => {
    const rem = db.getReminders().find((r) => r.id === req.params.id);
    if (!rem) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    const settings = db.getSettings();
    const tgResult = await dispatchReminderTelegramAlert(rem, settings.telegramSettings);

    db.updateReminder(rem.id, {
      phoneDispatched: true,
      telegramDispatched: true,
      dispatchedAt: new Date().toISOString(),
      dispatchedChannels: ['telegram']
    });

    db.addNotification({
      title: '✈️ Telegram Alert Sent',
      message: `Instant Telegram alert dispatched for "${rem.title}" to ${settings.telegramSettings?.chatId || '@' + DEFAULT_TELEGRAM_BOT_USERNAME}`,
      type: 'reminder',
      link: '/reminders'
    });

    res.json({ success: true, result: tgResult });
  });

  // --- TELEGRAM BOT ALERTS ENDPOINTS ---
  app.get('/api/telegram/config', async (req, res) => {
    const settings = db.getSettings();
    const botToken = process.env.TELEGRAM_BOT_TOKEN || settings.telegramSettings?.botToken || DEFAULT_TELEGRAM_BOT_TOKEN;
    const botInfoRes = await getTelegramBotInfo(botToken);

    res.json({
      telegramSettings: {
        enabled: settings.telegramSettings?.enabled ?? true,
        botUsername: settings.telegramSettings?.botUsername || DEFAULT_TELEGRAM_BOT_USERNAME,
        chatId: settings.telegramSettings?.chatId || '',
        telegramUsername: settings.telegramSettings?.telegramUsername || '',
        autoAlertOnDue: settings.telegramSettings?.autoAlertOnDue ?? true,
        lastActiveAt: settings.telegramSettings?.lastActiveAt
      },
      botConfigured: true,
      botInfo: botInfoRes.bot || {
        id: 8711965885,
        is_bot: true,
        first_name: 'Nexa AI Alerts',
        username: 'NexaTaskAlertsBot'
      },
      botUrl: TELEGRAM_BOT_URL,
      botUsername: DEFAULT_TELEGRAM_BOT_USERNAME
    });
  });

  app.put('/api/telegram/config', (req, res) => {
    const current = db.getSettings();
    const updated = db.updateSettings({
      telegramSettings: {
        ...(current.telegramSettings || {
          enabled: true,
          botToken: process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN,
          botUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
          chatId: '',
          autoAlertOnDue: true
        }),
        ...req.body,
        // Keep botToken secure on server
        botToken: process.env.TELEGRAM_BOT_TOKEN || current.telegramSettings?.botToken || DEFAULT_TELEGRAM_BOT_TOKEN
      }
    });
    res.json({
      success: true,
      telegramSettings: {
        enabled: updated.telegramSettings?.enabled,
        botUsername: updated.telegramSettings?.botUsername,
        chatId: updated.telegramSettings?.chatId,
        telegramUsername: updated.telegramSettings?.telegramUsername,
        autoAlertOnDue: updated.telegramSettings?.autoAlertOnDue
      }
    });
  });

  app.get('/api/telegram/status', async (req, res) => {
    const settings = db.getSettings();
    const info = await getTelegramBotInfo(process.env.TELEGRAM_BOT_TOKEN || settings.telegramSettings?.botToken);
    res.json(info);
  });

  app.get('/api/telegram/detect-chat', async (req, res) => {
    const settings = db.getSettings();
    const detected = await detectTelegramChatId(process.env.TELEGRAM_BOT_TOKEN || settings.telegramSettings?.botToken);
    if (detected.found && detected.chatId && req.query.autoSave === 'true') {
      db.updateSettings({
        telegramSettings: {
          ...(settings.telegramSettings || {
            enabled: true,
            botToken: process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN,
            botUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
            autoAlertOnDue: true
          }),
          chatId: detected.chatId,
          telegramUsername: detected.username || '',
          lastActiveAt: new Date().toISOString()
        }
      });
    }
    res.json(detected);
  });

  app.post('/api/telegram/send-test', async (req, res) => {
    const { chatId, title, taskMessage, message, startingPoint, endingPoint, scheduledTime, priority } = req.body;
    const settings = db.getSettings().telegramSettings;
    const targetChatId = String(chatId || settings?.chatId || '').trim();

    if (!targetChatId) {
      res.status(400).json({
        success: false,
        error: 'Please specify or auto-detect your Telegram Chat ID first. Open @NexaTaskAlertsBot and send /start or "hi"!'
      });
      return;
    }

    const alertTitle = title || 'Call the client';
    const alertMessage = taskMessage !== undefined ? taskMessage : (message !== undefined ? message : 'Discuss the project update with the client.');
    const now = Date.now();
    const alertScheduledTime = scheduledTime ? formatScheduledDisplayIST(scheduledTime) : format12HourIST(now);
    const alertTriggeredTime = format12HourIST(now);
    const alertPriority = (priority || 'HIGH').toUpperCase();

    const formattedAlert = buildTelegramAlertMessage({
      title: alertTitle,
      taskMessage: alertMessage || undefined,
      startingPoint: startingPoint || undefined,
      endingPoint: endingPoint || undefined,
      scheduledTime: alertScheduledTime,
      priority: alertPriority,
      triggeredTime: alertTriggeredTime,
      botUsername: settings?.botUsername || DEFAULT_TELEGRAM_BOT_USERNAME
    });

    const notificationId = `notif_tg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notification: TelegramReminderNotification = {
      id: notificationId,
      reminderId: `rem_test_${Date.now()}`,
      taskTitle: alertTitle,
      taskMessage: alertMessage || undefined,
      startingPoint: startingPoint || undefined,
      endingPoint: endingPoint || undefined,
      priority: alertPriority,
      scheduledTime: alertScheduledTime,
      triggeredTime: alertTriggeredTime,
      chatId: targetChatId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.createTelegramNotification(notification);

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

    const log = await sendTelegramMessage({
      chatId: targetChatId,
      text: formattedAlert,
      replyMarkup,
      reminderTitle: alertTitle,
      token: process.env.TELEGRAM_BOT_TOKEN || settings?.botToken || DEFAULT_TELEGRAM_BOT_TOKEN
    });

    if (log.ok && log.telegramMessageId) {
      const sentTime = format12HourIST(Date.now());
      const updatedNotif = db.updateTelegramNotification(notificationId, {
        status: 'sent',
        telegramMessageId: log.telegramMessageId,
        sentAt: new Date().toISOString(),
        sentTimestamp: sentTime
      });

      db.addNotification({
        title: '✈️ Telegram Alert Sent',
        message: `Sent alert to Telegram Chat ID ${targetChatId} via @${settings?.botUsername || DEFAULT_TELEGRAM_BOT_USERNAME}. Awaiting acknowledgement.`,
        type: 'reminder',
        link: '/dashboard'
      });
      res.json({ success: true, log, notification: updatedNotif, message: formattedAlert });
    } else {
      const updatedNotif = db.updateTelegramNotification(notificationId, {
        status: 'failed',
        errorMessage: log.error || 'Failed to dispatch alert'
      });
      res.json({ success: false, log, notification: updatedNotif, error: log.error, message: formattedAlert });
    }
  });

  // --- TELEGRAM NOTIFICATIONS (DELIVERY & ACKNOWLEDGEMENT TRACKING) ---
  app.get('/api/telegram/notifications', (req, res) => {
    res.json(db.getTelegramNotifications());
  });

  app.post('/api/telegram/notifications/:id/acknowledge', async (req, res) => {
    const notif = db.getTelegramNotificationById(req.params.id);
    if (!notif) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notif.status === 'acknowledged') {
      res.json({ success: true, notification: notif, message: 'Already acknowledged' });
      return;
    }

    const now = Date.now();
    const ackTimeIST = format12HourIST(now);
    const ackIso = new Date(now).toISOString();

    const updated = db.updateTelegramNotification(notif.id, {
      status: 'acknowledged',
      acknowledgedAt: ackIso,
      acknowledgedTime: ackTimeIST,
      acknowledgedBy: {
        username: 'dashboard_user',
        firstName: 'Dashboard User'
      }
    });

    db.addNotification({
      title: '✅ Telegram Reminder Acknowledged',
      message: `"${notif.taskTitle}" was acknowledged via Nexa AI Dashboard at ${ackTimeIST}.`,
      type: 'reminder',
      link: '/dashboard'
    });

    db.addActionHistory({
      action: 'Reminder Acknowledged (Dashboard)',
      category: 'reminder',
      details: `Manual acknowledgement on Dashboard for "${notif.taskTitle}" at ${ackTimeIST}`,
      status: 'success',
      meta: { notificationId: notif.id, reminderId: notif.reminderId }
    });

    res.json({ success: true, notification: updated });
  });

  app.delete('/api/telegram/notifications/:id', (req, res) => {
    const success = db.deleteTelegramNotification(req.params.id);
    res.json({ success });
  });

  app.delete('/api/telegram/notifications', (req, res) => {
    db.clearTelegramNotifications();
    res.json({ success: true });
  });

  // --- TELEGRAM WEBHOOK ENDPOINTS ---
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const result = await handleTelegramWebhookUpdate(req.body);
      res.json({ ok: true, result });
    } catch (err: any) {
      console.error('[Nexa AI Telegram Bot Webhook Error]:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/telegram/webhook-info', async (req, res) => {
    const info = await getTelegramWebhookInfo();
    res.json(info);
  });

  app.post('/api/telegram/set-webhook', async (req, res) => {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Webhook URL is required' });
      return;
    }
    const result = await setTelegramWebhook(url);
    res.json(result);
  });

  app.post('/api/telegram/delete-webhook', async (req, res) => {
    const result = await deleteTelegramWebhook();
    res.json(result);
  });

  app.get('/api/telegram/logs', (req, res) => {
    res.json(db.getTelegramDispatchLogs());
  });

  app.delete('/api/telegram/logs', (req, res) => {
    db.clearTelegramDispatchLogs();
    res.json({ success: true });
  });

  // --- PHONE & WHATSAPP / SMS ENDPOINTS ---
  app.get('/api/phone/config', (req, res) => {
    const settings = db.getSettings();
    res.json({
      phoneSettings: settings.phoneSettings || {
        enabled: true,
        phoneNumber: '+1 (555) 382-9104',
        channels: 'both',
        countryCode: '+1',
        autoAlertOnDue: true
      },
      hasTwilioEnv: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    });
  });

  app.put('/api/phone/config', (req, res) => {
    const current = db.getSettings();
    const updated = db.updateSettings({
      phoneSettings: {
        ...(current.phoneSettings || {
          enabled: true,
          phoneNumber: '+1 (555) 382-9104',
          channels: 'both',
          countryCode: '+1',
          autoAlertOnDue: true
        }),
        ...req.body
      }
    });
    res.json({ success: true, phoneSettings: updated.phoneSettings });
  });

  app.get('/api/phone/logs', (req, res) => {
    res.json(db.getPhoneDispatchLogs());
  });

  app.delete('/api/phone/logs', (req, res) => {
    db.clearPhoneDispatchLogs();
    res.json({ success: true });
  });

  app.post('/api/phone/send-test', async (req, res) => {
    const { phoneNumber, channel, message } = req.body;
    const phoneSettings = db.getSettings().phoneSettings;
    const target = phoneNumber || phoneSettings?.phoneNumber || '+1 (555) 382-9104';
    const targetChannel = channel || phoneSettings?.channels || 'both';

    const testMsg = message || `🔔 [Nexa AI Test Alert] WhatsApp & SMS notification delivery is active! Your scheduled reminders will automatically trigger phone alerts right on time.`;

    const logs = [];
    if (targetChannel === 'whatsapp' || targetChannel === 'both') {
      const waLog = await sendWhatsAppMessage({
        to: target,
        message: testMsg,
        reminderTitle: 'Test Notification Alert',
        phoneSettings
      });
      logs.push(waLog);
    }

    if (targetChannel === 'sms' || targetChannel === 'both') {
      const smsLog = await sendSMSMessage({
        to: target,
        message: testMsg,
        reminderTitle: 'Test Notification Alert',
        phoneSettings
      });
      logs.push(smsLog);
    }

    db.addNotification({
      title: '📱 Test Phone Alert Dispatched',
      message: `Sent test ${targetChannel.toUpperCase()} alert to ${target}`,
      type: 'reminder',
      link: '/reminders'
    });

    res.json({ success: true, logs });
  });

  // --- NOTIFICATIONS ENDPOINTS (PER USER) ---
  app.get('/api/notifications', (req: any, res) => {
    res.json(db.getNotifications(req.userId));
  });

  app.post('/api/notifications', (req: any, res) => {
    const { title, message, type, link } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Notification title required' });
      return;
    }
    const notif = db.addNotification({
      title,
      message: message || '',
      type: type || 'reminder',
      link: link || '/reminders'
    }, req.userId);
    res.status(201).json(notif);
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const success = db.markNotificationRead(req.params.id);
    res.json({ success });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    db.markAllNotificationsRead();
    res.json({ success: true });
  });

  // --- CHAT & TOOL AGENT ENDPOINTS ---
  app.get('/api/chat/history', (req, res) => {
    res.json(db.getChatHistory());
  });

  app.delete('/api/chat/history', (req, res) => {
    db.clearChatHistory();
    res.json({ success: true });
  });

  app.get('/api/chat/sessions', (req, res) => {
    res.json(db.getChatSessions());
  });

  app.get('/api/chat/sessions/:id', (req, res) => {
    const session = db.getChatSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  });

  app.post('/api/chat/sessions', (req, res) => {
    const session = db.createChatSession(req.body.title, req.body.messages);
    res.status(201).json(session);
  });

  app.put('/api/chat/sessions/:id', (req, res) => {
    const updated = db.updateChatSession(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(updated);
  });

  app.post('/api/chat/sessions/:id/restore', (req, res) => {
    const session = db.getChatSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    db.setChatHistory(session.messages || []);
    res.json({ success: true, session });
  });

  app.delete('/api/chat/sessions/:id', (req, res) => {
    const success = db.deleteChatSession(req.params.id);
    res.json({ success });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      let { message, forceExecuteTool, sessionId } = req.body;
      if (!message && !forceExecuteTool) {
        res.status(400).json({ error: 'Message or tool call required' });
        return;
      }

      // If no sessionId provided and this is a new message, auto-create a session
      if (!sessionId && message) {
        const newSession = db.createChatSession(message.slice(0, 36));
        sessionId = newSession.id;
      }

      if (message) {
        db.addChatMessage({ role: 'user', content: message }, sessionId);
      }

      const response = await processChat(message || '', forceExecuteTool, sessionId);
      res.json({ ...response, sessionId });
    } catch (err: any) {
      console.error('Chat endpoint error:', err);
      res.status(500).json({ error: err?.message || 'Chat processing error' });
    }
  });

  // --- WORKSPACE SNAPSHOT / SAVE ---
  app.post('/api/workspace/snapshot', (req, res) => {
    const { title } = req.body;
    const session = db.saveChatSession(title || `Workspace Snapshot (${new Date().toLocaleDateString()})`);
    res.status(201).json({
      success: true,
      session,
      tasks: db.getTasks(),
      events: db.getEvents(),
      reminders: db.getReminders()
    });
  });

  // --- ACTION HISTORY & EXPORT ENDPOINTS ---
  app.get('/api/history/actions', (req, res) => {
    res.json(db.getActionHistory());
  });

  app.post('/api/history/actions', (req, res) => {
    const newAct = db.addActionHistory(req.body);
    res.status(201).json(newAct);
  });

  app.delete('/api/history/actions', (req, res) => {
    db.clearActionHistory();
    res.json({ success: true });
  });

  app.get('/api/history/export', (req, res) => {
    res.json(db.exportAllData());
  });

  // --- SEARCH ENDPOINT ---
  app.get('/api/search', (req, res) => {
    const q = (req.query.q as string) || '';
    res.json(db.search(q));
  });

  // --- SETTINGS ENDPOINTS (PER USER) ---
  app.get('/api/settings', (req: any, res) => {
    res.json(db.getSettings(req.userId));
  });

  app.put('/api/settings', (req: any, res) => {
    const updated = db.updateSettings(req.body, req.userId);
    res.json(updated);
  });

  // --- AI SPECIALIZED ENDPOINTS ---
  app.post('/api/ai/write-email', async (req, res) => {
    const { prompt, mode, originalText } = req.body;
    const result = await generateAIEmail(prompt || 'Write email', mode || 'generate', originalText);
    res.json(result);
  });

  app.post('/api/ai/task-breakdown', async (req, res) => {
    const { title, description } = req.body;
    const subtasks = await generateTaskBreakdown(title, description);
    res.json({ subtasks });
  });

  app.get('/api/ai/suggest-schedule', async (req, res) => {
    const suggestions = await suggestFreeSchedule();
    res.json({ suggestions });
  });

  // --- VITE MIDDLEWARE / PRODUCTION STATIC ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
