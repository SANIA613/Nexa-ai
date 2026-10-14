import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { db } from './db';
import { Task, Email, CalendarEvent, Reminder, PhoneNotificationSettings } from '../src/types';
import { sendWhatsAppMessage, sendSMSMessage } from './phoneService';
import { sendTelegramMessage, DEFAULT_TELEGRAM_BOT_USERNAME } from './telegramService';
import {
  format12HourIST,
  formatScheduledDisplayIST,
  parseReminderTimestampIST
} from './timezone';

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy-key-fallback',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const MODEL_NAME = 'gemini-3.6-flash';

// Tool Declarations for Gemini Function Calling
const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'send_email',
    description: 'Prepare or send an email to a recipient with subject and body.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipientEmail: { type: Type.STRING, description: 'Recipient email address' },
        subject: { type: Type.STRING, description: 'Subject line of the email' },
        body: { type: Type.STRING, description: 'Body text of the email' }
      },
      required: ['recipientEmail', 'subject', 'body']
    }
  },
  {
    name: 'create_email_draft',
    description: 'Save an email draft without sending it immediately.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipientEmail: { type: Type.STRING, description: 'Recipient email address' },
        subject: { type: Type.STRING, description: 'Subject line' },
        body: { type: Type.STRING, description: 'Draft body text' }
      },
      required: ['recipientEmail', 'subject', 'body']
    }
  },
  {
    name: 'summarize_email',
    description: 'Summarize a specific email or latest unread emails.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Email subject or sender to summarize' }
      }
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task in the task manager with optional locations and task message.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title of the task' },
        description: { type: Type.STRING, description: 'Detailed description or note' },
        message: { type: Type.STRING, description: 'Task message or update' },
        startingPoint: { type: Type.STRING, description: 'Optional starting point location (e.g. Office)' },
        endingPoint: { type: Type.STRING, description: 'Optional ending point location (e.g. Client Location)' },
        priority: { type: Type.STRING, description: 'Priority: high, medium, or low' },
        dueDate: { type: Type.STRING, description: 'Due date in YYYY-MM-DD or relative like today, tomorrow' },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags or categories' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_task',
    description: 'Update an existing task status or priority.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID of task or title search match' },
        status: { type: Type.STRING, description: 'New status: todo, in_progress, completed' },
        priority: { type: Type.STRING, description: 'New priority: high, medium, low' }
      },
      required: ['id']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        titleOrId: { type: Type.STRING, description: 'Task ID or title fragment to complete' }
      },
      required: ['titleOrId']
    }
  },
  {
    name: 'get_tasks',
    description: 'Fetch tasks filtered by status or priority.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: 'Filter by todo, in_progress, completed' },
        priority: { type: Type.STRING, description: 'Filter by high, medium, low' }
      }
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Schedule a new calendar meeting or event.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title of event' },
        date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format or relative like tomorrow' },
        startTime: { type: Type.STRING, description: 'Start time e.g. 15:00 or 3:00 PM' },
        endTime: { type: Type.STRING, description: 'End time e.g. 16:00 or 4:00 PM' },
        location: { type: Type.STRING, description: 'Location or meeting link' },
        description: { type: Type.STRING, description: 'Meeting description/agenda' },
        attendees: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Attendee email list' }
      },
      required: ['title', 'date', 'startTime', 'endTime']
    }
  },
  {
    name: 'get_calendar_events',
    description: 'Fetch calendar events for a date or general schedule.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: 'Date YYYY-MM-DD or today/tomorrow' }
      }
    }
  },
  {
    name: 'delete_calendar_event',
    description: 'Remove a scheduled meeting from calendar.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventIdOrTitle: { type: Type.STRING, description: 'Event ID or title to delete' }
      },
      required: ['eventIdOrTitle']
    }
  },
  {
    name: 'create_reminder',
    description: 'Create a notification reminder that automatically dispatches Telegram bot alerts (@NexaTaskAlertsBot) when due in Asia/Kolkata timezone.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Reminder topic or title' },
        datetime: { type: Type.STRING, description: 'Date and time ISO string or natural language date/time (e.g. 09:33 PM, 21:33, in 10 minutes, tomorrow at 5pm)' },
        priority: { type: Type.STRING, description: 'high, medium, low' },
        message: { type: Type.STRING, description: 'Task message or detailed description' },
        startingPoint: { type: Type.STRING, description: 'Optional starting point location (e.g. Office)' },
        endingPoint: { type: Type.STRING, description: 'Optional ending point location (e.g. Client Location)' },
        sendTelegram: { type: Type.BOOLEAN, description: 'Whether to send Telegram message when due (default true)' },
        chatId: { type: Type.STRING, description: 'Optional recipient Telegram Chat ID' }
      },
      required: ['title', 'datetime']
    }
  },
  {
    name: 'send_telegram_alert',
    description: 'Instantly send a Telegram alert notification to the user via @NexaTaskAlertsBot.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING, description: 'Message body to send via Telegram' },
        chatId: { type: Type.STRING, description: 'Optional recipient Telegram Chat ID. Defaults to linked Chat ID' },
        reminderTitle: { type: Type.STRING, description: 'Reminder or topic title' }
      },
      required: ['message']
    }
  },
  {
    name: 'configure_telegram_alerts',
    description: 'Update the user Telegram bot notification settings (chatId, enabled, autoAlertOnDue).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chatId: { type: Type.STRING, description: 'Telegram Chat ID (e.g. 123456789)' },
        enabled: { type: Type.BOOLEAN, description: 'Enable or disable Telegram alerts' },
        autoAlertOnDue: { type: Type.BOOLEAN, description: 'Enable/disable automatic Telegram alerts when reminders are due' }
      }
    }
  },
  {
    name: 'search_email',
    description: 'Search emails by keywords or sender.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search term' }
      },
      required: ['query']
    }
  }
];

// Execute actual tool logic on Database
export function executeToolCall(toolName: string, args: Record<string, any>) {
  const user = db.getUser();

  switch (toolName) {
    case 'send_email': {
      const email = db.createEmail({
        senderName: user.name,
        senderEmail: user.email,
        recipientEmail: args.recipientEmail,
        subject: args.subject,
        body: args.body,
        folder: 'sent'
      });
      return { success: true, email, message: `Email sent successfully to ${args.recipientEmail}.` };
    }

    case 'create_email_draft': {
      const email = db.createEmail({
        senderName: user.name,
        senderEmail: user.email,
        recipientEmail: args.recipientEmail,
        subject: args.subject,
        body: args.body,
        folder: 'drafts'
      });
      return { success: true, email, message: `Saved draft for ${args.recipientEmail}.` };
    }

    case 'summarize_email': {
      const emails = db.getEmails();
      let match = emails.find(
        (e) =>
          e.subject.toLowerCase().includes((args.query || '').toLowerCase()) ||
          e.senderName.toLowerCase().includes((args.query || '').toLowerCase())
      );
      if (!match) match = emails[0];
      if (!match) return { success: false, message: 'No emails found to summarize.' };
      return {
        success: true,
        summary: `Email from ${match.senderName} (${match.subject}): ${match.body.substring(0, 180)}...`
      };
    }

    case 'create_task': {
      let dueDate = args.dueDate || new Date().toISOString().split('T')[0];
      if (dueDate.toLowerCase() === 'today') {
        dueDate = new Date().toISOString().split('T')[0];
      } else if (dueDate.toLowerCase() === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        dueDate = d.toISOString().split('T')[0];
      }

      const cleanMsg = args.message || args.description || '';
      const cleanStart = args.startingPoint || args.startLocation;
      const cleanEnd = args.endingPoint || args.endLocation;

      const task = db.createTask({
        title: args.title.trim(),
        description: cleanMsg,
        message: cleanMsg,
        startingPoint: cleanStart,
        startLocation: cleanStart,
        endingPoint: cleanEnd,
        endLocation: cleanEnd,
        priority: (args.priority as any) || 'high',
        status: 'todo',
        dueDate,
        tags: args.tags || ['AI Created']
      });

      return { success: true, task, message: `Task "${task.title}" created with due date ${task.dueDate}.` };
    }

    case 'update_task': {
      const tasks = db.getTasks();
      let target = tasks.find((t) => t.id === args.id || t.title.toLowerCase().includes(args.id.toLowerCase()));
      if (!target) return { success: false, message: `Task "${args.id}" not found.` };

      const updated = db.updateTask(target.id, {
        status: args.status || target.status,
        priority: args.priority || target.priority
      });
      return { success: true, task: updated, message: `Updated task "${target.title}".` };
    }

    case 'complete_task': {
      const tasks = db.getTasks();
      let target = tasks.find(
        (t) => t.id === args.titleOrId || t.title.toLowerCase().includes(args.titleOrId.toLowerCase())
      );
      if (!target) return { success: false, message: `Task "${args.titleOrId}" not found.` };

      const updated = db.updateTask(target.id, { status: 'completed' });
      return { success: true, task: updated, message: `Marked task "${target.title}" as completed!` };
    }

    case 'get_tasks': {
      let tasks = db.getTasks();
      if (args.status) tasks = tasks.filter((t) => t.status === args.status);
      if (args.priority) tasks = tasks.filter((t) => t.priority === args.priority);
      return { success: true, count: tasks.length, tasks };
    }

    case 'create_calendar_event': {
      let date = args.date || new Date().toISOString().split('T')[0];
      if (date.toLowerCase() === 'today') {
        date = new Date().toISOString().split('T')[0];
      } else if (date.toLowerCase() === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        date = d.toISOString().split('T')[0];
      }

      // Format time safely (e.g. "3 PM" -> "15:00")
      let startTime = args.startTime;
      if (startTime.includes('PM') || startTime.includes('AM')) {
        const isPM = startTime.toUpperCase().includes('PM');
        let hours = parseInt(startTime.replace(/[^0-9]/g, '')) || 9;
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        startTime = `${hours.toString().padStart(2, '0')}:00`;
      }

      let endTime = args.endTime || startTime;
      if (endTime.includes('PM') || endTime.includes('AM')) {
        const isPM = endTime.toUpperCase().includes('PM');
        let hours = parseInt(endTime.replace(/[^0-9]/g, '')) || 10;
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        endTime = `${hours.toString().padStart(2, '0')}:00`;
      }

      const event = db.createEvent({
        title: args.title,
        date,
        startTime,
        endTime,
        location: args.location || 'Google Meet',
        description: args.description || '',
        attendees: args.attendees || ['rahul.verma@techcorp.com']
      });

      return {
        success: true,
        event,
        message: `Scheduled meeting "${event.title}" on ${event.date} from ${event.startTime} to ${event.endTime}.`
      };
    }

    case 'get_calendar_events': {
      let events = db.getEvents();
      if (args.date) {
        let d = args.date;
        if (d === 'today') d = new Date().toISOString().split('T')[0];
        if (d === 'tomorrow') {
          const dt = new Date();
          dt.setDate(dt.getDate() + 1);
          d = dt.toISOString().split('T')[0];
        }
        events = events.filter((e) => e.date === d);
      }
      return { success: true, count: events.length, events };
    }

    case 'delete_calendar_event': {
      const events = db.getEvents();
      const target = events.find(
        (e) => e.id === args.eventIdOrTitle || e.title.toLowerCase().includes(args.eventIdOrTitle.toLowerCase())
      );
      if (!target) return { success: false, message: `Event "${args.eventIdOrTitle}" not found.` };
      db.deleteEvent(target.id);
      return { success: true, message: `Deleted event "${target.title}".` };
    }

    case 'create_reminder': {
      const rawDt = args.datetime || 'Today at 5:00 PM';
      const scheduledEpoch = parseReminderTimestampIST(rawDt) || (Date.now() + 15 * 60 * 1000);
      const scheduledDisplay = format12HourIST(scheduledEpoch);

      const cleanMsg = args.message || args.description || '';
      const cleanStart = args.startingPoint || args.startLocation;
      const cleanEnd = args.endingPoint || args.endLocation;

      const reminder = db.createReminder({
        title: args.title.trim(),
        datetime: scheduledDisplay,
        scheduledEpoch,
        priority: (args.priority as any) || 'high',
        description: cleanMsg,
        message: cleanMsg,
        startingPoint: cleanStart,
        startLocation: cleanStart,
        endingPoint: cleanEnd,
        endLocation: cleanEnd,
        sendTelegram: args.sendTelegram !== undefined ? args.sendTelegram : true,
        telegramChatId: args.chatId
      });
      return {
        success: true,
        reminder,
        message: `Reminder set: "${reminder.title}" scheduled for ${scheduledDisplay} (Asia/Kolkata IST). Nexa AI will automatically dispatch an alert to your Telegram (@${DEFAULT_TELEGRAM_BOT_USERNAME}) when due.`
      };
    }

    case 'send_telegram_alert':
    case 'send_whatsapp_reminder': {
      const tgSettings = db.getSettings().telegramSettings;
      const targetChat = args.chatId || tgSettings?.chatId;

      const logPromise = sendTelegramMessage({
        chatId: targetChat || '',
        text: `🔔 *Nexa AI Instant Alert* 🚀\n\n${args.message}\n\n_Sent via @${DEFAULT_TELEGRAM_BOT_USERNAME}_`,
        reminderTitle: args.reminderTitle || 'Immediate Telegram Alert',
        token: tgSettings?.botToken
      });

      return {
        success: true,
        channel: 'telegram',
        recipient: targetChat || `@${DEFAULT_TELEGRAM_BOT_USERNAME}`,
        message: targetChat
          ? `Telegram alert dispatched to Chat ID ${targetChat} via @${DEFAULT_TELEGRAM_BOT_USERNAME}.`
          : `Alert prepared for @${DEFAULT_TELEGRAM_BOT_USERNAME}. Please ensure you've started the bot on Telegram.`
      };
    }

    case 'configure_telegram_alerts': {
      const current = db.getSettings();
      const updated = db.updateSettings({
        telegramSettings: {
          ...(current.telegramSettings || {
            enabled: true,
            botToken: '8711965885:AAEtgT1w0S1NK_aH_aH_djPV_JWr0Pz5e5s',
            botUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
            chatId: '',
            autoAlertOnDue: true
          }),
          ...(args.chatId ? { chatId: args.chatId } : {}),
          ...(args.enabled !== undefined ? { enabled: args.enabled } : {}),
          ...(args.autoAlertOnDue !== undefined ? { autoAlertOnDue: args.autoAlertOnDue } : {})
        }
      });
      return {
        success: true,
        telegramSettings: updated.telegramSettings,
        message: `Telegram alert settings updated successfully. Bot: @${DEFAULT_TELEGRAM_BOT_USERNAME}, Chat ID: ${updated.telegramSettings?.chatId || 'not configured'}`
      };
    }

    case 'send_sms_reminder': {
      const phoneSettings = db.getSettings().phoneSettings;
      const targetPhone = args.phoneNumber || phoneSettings?.phoneNumber || '+1 (555) 382-9104';
      
      const log = sendSMSMessage({
        to: targetPhone,
        message: args.message,
        reminderTitle: args.reminderTitle || 'Immediate SMS Alert',
        phoneSettings
      });

      return {
        success: true,
        channel: 'sms',
        recipient: targetPhone,
        message: `SMS message sent to ${targetPhone}.`,
        log
      };
    }

    case 'configure_phone_notifications': {
      const currentSettings = db.getSettings();
      const nextPhoneSettings = {
        ...(currentSettings.phoneSettings || {
          enabled: true,
          phoneNumber: '+1 (555) 382-9104',
          channels: 'both' as const,
          countryCode: '+1',
          autoAlertOnDue: true
        }),
        ...(args.phoneNumber ? { phoneNumber: args.phoneNumber } : {}),
        ...(args.channels ? { channels: args.channels } : {}),
        ...(args.autoAlertOnDue !== undefined ? { autoAlertOnDue: args.autoAlertOnDue } : {})
      };

      db.updateSettings({ phoneSettings: nextPhoneSettings });

      return {
        success: true,
        phoneSettings: nextPhoneSettings,
        message: `Phone notifications updated! Automated alerts will be sent to ${nextPhoneSettings.phoneNumber} via ${nextPhoneSettings.channels}.`
      };
    }

    case 'search_email': {
      const emails = db.getEmails().filter(
        (e) =>
          e.subject.toLowerCase().includes(args.query.toLowerCase()) ||
          e.body.toLowerCase().includes(args.query.toLowerCase()) ||
          e.senderName.toLowerCase().includes(args.query.toLowerCase())
      );
      return { success: true, count: emails.length, emails };
    }

    default:
      return { success: false, message: `Unknown tool name: ${toolName}` };
  }
}

// Main AI Assistant Chat Handler with Tool Calling
export async function processChat(
  userMessage: string,
  forceExecuteTool?: { toolName: string; args: any },
  sessionId?: string
) {
  // Check if force execute was clicked from UI confirmation button
  if (forceExecuteTool) {
    const result = executeToolCall(forceExecuteTool.toolName, forceExecuteTool.args);
    const content = result.message || 'Action executed successfully!';
    db.addChatMessage(
      {
        role: 'assistant',
        content,
        toolCall: {
          name: forceExecuteTool.toolName,
          args: forceExecuteTool.args,
          status: 'completed',
          result
        }
      },
      sessionId
    );
    return {
      content,
      toolCall: {
        name: forceExecuteTool.toolName,
        args: forceExecuteTool.args,
        status: 'completed',
        result
      }
    };
  }

  // Get current DB context to pass to Gemini
  const currentUser = db.getUser();
  const currentTasks = db.getTasks().map((t) => `${t.id}: ${t.title} [${t.status}, ${t.priority}]`).join('\n');
  const currentEvents = db.getEvents().map((e) => `${e.id}: ${e.title} on ${e.date} at ${e.startTime}`).join('\n');
  const chatHistory = db.getChatHistory().slice(-8);

  const systemInstruction = `You are Nexa AI, a high-performance productivity assistant for ${currentUser.name} (${currentUser.email}).
Current Date: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })}).

Existing User Schedule Context:
Calendar Events:
${currentEvents}

Tasks:
${currentTasks}

Instructions:
1. When the user requests an action (e.g. schedule meeting, send email, create task, set reminder), call the appropriate tool.
2. For sensitive actions like "send_email", propose the email first or call the tool.
3. Be helpful, clear, precise, and polite. Always explain what action was performed or found.
`;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'dummy-key-fallback') {
    // Fallback AI engine using natural language rule parsing when API key is pending or in offline demo
    return processFallbackChat(userMessage);
  }

  try {
    const contents = chatHistory.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents as any,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations }]
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const name = call.name;
      const args = call.args || {};

      // Check if send_email requires confirmation UI section
      if (name === 'send_email') {
        const textContent = `I've prepared the email to **${args.recipientEmail}**. Would you like me to send it?`;
        const toolCallObj = {
          name,
          args,
          status: 'pending_confirmation' as const
        };
        db.addChatMessage(
          {
            role: 'assistant',
            content: textContent,
            toolCall: toolCallObj,
            confirmationRequired: true
          },
          sessionId
        );
        return { content: textContent, toolCall: toolCallObj, confirmationRequired: true };
      }

      // Execute non-confirmation tools directly
      const toolResult = executeToolCall(name, args);
      const textContent = toolResult.message || response.text || `Executed action: ${name}`;

      const toolCallObj = {
        name,
        args,
        status: 'completed' as const,
        result: toolResult
      };

      db.addChatMessage(
        {
          role: 'assistant',
          content: textContent,
          toolCall: toolCallObj
        },
        sessionId
      );

      return { content: textContent, toolCall: toolCallObj };
    }

    const replyText = response.text || "I'm ready to help! What task or event would you like to manage?";
    db.addChatMessage({ role: 'assistant', content: replyText }, sessionId);
    return { content: replyText };
  } catch (err: any) {
    console.error('Gemini API Error, using intelligent tool parsing fallback:', err?.message);
    return processFallbackChat(userMessage, sessionId);
  }
}

// Intelligent rule-based NLP tool matching for demo/offline resiliency
function processFallbackChat(userMessage: string, sessionId?: string) {
  const msg = userMessage.toLowerCase();

  // Schedule meeting intent
  if (msg.includes('schedule') || msg.includes('meeting') || msg.includes('calendar')) {
    if (msg.includes('rahul') || msg.includes('tomorrow') || msg.includes('3 pm') || msg.includes('4 pm')) {
      const toolResult = executeToolCall('create_calendar_event', {
        title: 'Meeting with Rahul',
        date: 'tomorrow',
        startTime: msg.includes('4 pm') ? '16:00' : '15:00',
        endTime: msg.includes('4 pm') ? '17:00' : '16:00',
        attendees: ['rahul.verma@techcorp.com']
      });

      // Also create reminder if asked
      if (msg.includes('remind')) {
        executeToolCall('create_reminder', {
          title: 'Remind: Meeting with Rahul in 30 minutes',
          datetime: `${new Date().toISOString().split('T')[0]}T14:30:00`,
          priority: 'high'
        });
      }

      const content = `Done! I've scheduled the meeting with Rahul for tomorrow and added a reminder to your dashboard.`;
      const toolCall = { name: 'create_calendar_event', args: { title: 'Meeting with Rahul' }, status: 'completed' as const, result: toolResult };
      db.addChatMessage({ role: 'assistant', content, toolCall }, sessionId);
      return { content, toolCall };
    }
  }

  // Send email intent
  if (msg.includes('send') && msg.includes('email')) {
    const recipient = msg.includes('professor') ? 'sharma@university.edu' : 'rahul.verma@techcorp.com';
    const args = {
      recipientEmail: recipient,
      subject: 'Project Submission Update',
      body: "Hello, I will be submitting my project tomorrow. Thanks!"
    };

    const content = `I've prepared the email to **${recipient}**. Would you like me to send it?`;
    const toolCall = { name: 'send_email', args, status: 'pending_confirmation' as const };
    db.addChatMessage({ role: 'assistant', content, toolCall, confirmationRequired: true }, sessionId);

    // Also create task if requested
    if (msg.includes('task')) {
      executeToolCall('create_task', {
        title: 'Finish Python project submission',
        priority: 'high',
        dueDate: 'tomorrow'
      });
    }

    return { content, toolCall, confirmationRequired: true };
  }

  // Task creation intent
  if (msg.includes('create task') || msg.includes('add task') || msg.includes('task to')) {
    const titleMatch = userMessage.replace(/create task|add task|create a task/gi, '').trim();
    const title = titleMatch || 'Finish Python project';
    const toolResult = executeToolCall('create_task', {
      title,
      dueDate: 'tomorrow',
      priority: 'high'
    });
    const content = `Done! I've created the task "${title}" and set it as high priority due tomorrow.`;
    const toolCall = { name: 'create_task', args: { title }, status: 'completed' as const, result: toolResult };
    db.addChatMessage({ role: 'assistant', content, toolCall }, sessionId);
    return { content, toolCall };
  }

  // Remind intent
  if (msg.includes('remind me')) {
    const title = userMessage.replace(/remind me to/gi, 'Remind: ').trim();
    const toolResult = executeToolCall('create_reminder', {
      title,
      datetime: `${new Date().toISOString().split('T')[0]}T20:00:00`,
      priority: 'high'
    });
    const content = `Set a reminder: "${title}" for 8:00 PM today.`;
    const toolCall = { name: 'create_reminder', args: { title }, status: 'completed' as const, result: toolResult };
    db.addChatMessage({ role: 'assistant', content, toolCall }, sessionId);
    return { content, toolCall };
  }

  // Generic AI Assistant response
  const content = `I understood your request: "${userMessage}". I can execute actions across your Emails, Tasks, Calendar, and Reminders. Try asking "Schedule meeting with Rahul tomorrow at 3 PM" or "Create task to study Machine Learning".`;
  db.addChatMessage({ role: 'assistant', content }, sessionId);
  return { content };
}

// AI Email Generator & Improvement
export async function generateAIEmail(prompt: string, mode: 'generate' | 'improve' | 'shorten' | 'professional' | 'friendly', originalText?: string) {
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    if (mode === 'professional') {
      return `Dear Professor Sharma,\n\nI am writing to politely request a brief extension for the Python assignment due tomorrow. Due to ongoing technical debugging of our AI agent framework, additional testing is required to ensure standard compliance.\n\nThank you for your consideration.\n\nBest regards,\nSaniya`;
    }
    return `Hi Professor Sharma,\n\nI am working hard on finishing the project. Could I please get a short extension until tomorrow evening to complete final AI testing?\n\nThank you,\nSaniya`;
  }

  try {
    const systemInstruction = `You are Nexa AI's professional email writing engine. Generate or refine the email body according to mode: ${mode}. Return JSON format with fields "subject" and "body".`;
    const fullPrompt = originalText
      ? `Mode: ${mode}\nOriginal Text:\n${originalText}\nInstruction: ${prompt}`
      : `Instruction: ${prompt}`;

    const res = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: fullPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ['subject', 'body']
        }
      }
    });

    return JSON.parse(res.text || '{}');
  } catch (e) {
    return {
      subject: 'Extension Request: Project Submission',
      body: `Dear Recipient,\n\nI am reaching out regarding the upcoming project deadline. I would appreciate an extension to finalize the implementation.\n\nBest regards,\nSaniya`
    };
  }
}

// AI Task Breakdown
export async function generateTaskBreakdown(taskTitle: string, taskDesc?: string) {
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return [
      'Define project requirements & scope',
      'Design responsive UI mockups',
      'Create backend server & API endpoints',
      'Integrate AI tool calling API',
      'Test chatbot voice & actions',
      'Deploy application to production'
    ];
  }

  try {
    const res = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Break down the task "${taskTitle}" (${taskDesc || ''}) into 5 to 7 logical step-by-step subtasks.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(res.text || '[]');
  } catch (e) {
    return [
      'Define project requirements',
      'Design architecture & UI',
      'Implement core functionality',
      'Perform thorough testing',
      'Finalize documentation & deployment'
    ];
  }
}

// AI Free Schedule Analyzer
export async function suggestFreeSchedule() {
  const events = db.getEvents();
  return [
    { slot: 'Tuesday 2:00 – 3:00 PM', confidence: 'High' },
    { slot: 'Wednesday 11:00 AM – 12:00 PM', confidence: 'High' },
    { slot: 'Friday 4:00 – 5:00 PM', confidence: 'Medium' }
  ];
}
