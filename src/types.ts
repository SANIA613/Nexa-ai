export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'trash';
export type ReminderType = 'task' | 'event' | 'custom';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  message?: string;
  startingPoint?: string;
  startLocation?: string;
  endingPoint?: string;
  endLocation?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string; // ISO date string or YYYY-MM-DD
  tags: string[];
  createdAt: string;
  subtasks?: SubTask[];
}

export interface EmailAttachment {
  name: string;
  size: string;
  url?: string;
}

export interface Email {
  id: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  folder: EmailFolder;
  read: boolean;
  starred: boolean;
  timestamp: string;
  attachments?: EmailAttachment[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  attendees: string[];
  location?: string;
  reminderMinutesBefore?: number;
  color?: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  message?: string;
  startingPoint?: string;
  startLocation?: string;
  endingPoint?: string;
  endLocation?: string;
  datetime: string; // ISO string or time string
  scheduledEpoch?: number; // Exact UTC epoch in milliseconds
  priority: Priority;
  completed: boolean;
  snoozedUntil?: string;
  snoozedUntilEpoch?: number;
  relatedType?: ReminderType;
  relatedId?: string;
  phoneDispatched?: boolean;
  telegramDispatched?: boolean;
  dispatchedAt?: string;
  dispatchedChannels?: ('telegram' | 'whatsapp' | 'sms')[];
  sendTelegram?: boolean;
  telegramChatId?: string;
  sendWhatsApp?: boolean;
  sendSMS?: boolean;
  phoneNumber?: string;
}

export type TelegramNotificationStatus = 'pending' | 'sent' | 'failed' | 'acknowledged';

export interface TelegramReminderNotification {
  id: string; // Unique notification ID
  reminderId: string; // Linked reminder ID
  taskId?: string; // Linked task ID
  taskTitle: string; // Title of the task/reminder
  taskMessage?: string; // Task message / description
  startingPoint?: string; // Optional starting location
  endingPoint?: string; // Optional ending location
  priority: string; // "HIGH" | "MEDIUM" | "LOW"
  scheduledTime: string; // 12-hour IST e.g. "09:33 PM"
  triggeredTime: string; // 12-hour IST e.g. "09:33 PM"
  chatId: string; // Telegram chat ID
  telegramMessageId?: number; // Telegram message ID from Bot API
  status: TelegramNotificationStatus; // Pending | Sent | Failed | Acknowledged
  sentAt?: string; // ISO timestamp when Telegram API accepted sendMessage
  sentTimestamp?: string; // 12-hour format or formatted time
  acknowledgedAt?: string; // ISO timestamp when user confirmed
  acknowledgedTime?: string; // 12-hour IST e.g. "09:35 PM"
  acknowledgedBy?: {
    userId?: number;
    username?: string;
    firstName?: string;
  };
  errorMessage?: string;
  createdAt: string;
}

export interface TelegramDispatchLog {
  id: string;
  reminderId?: string;
  reminderTitle?: string;
  chatId: string;
  recipientName?: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged' | 'delivered';
  timestamp: string;
  telegramMessageId?: number;
  acknowledgedAt?: string;
  error?: string;
}

export interface TelegramNotificationSettings {
  enabled: boolean;
  botToken: string;
  botUsername: string;
  chatId: string;
  telegramUsername?: string;
  autoAlertOnDue: boolean;
  lastActiveAt?: string;
}

export interface PhoneDispatchLog {
  id: string;
  reminderId?: string;
  reminderTitle?: string;
  channel: 'whatsapp' | 'sms';
  recipientPhone: string;
  message: string;
  status: 'delivered' | 'sent' | 'failed';
  timestamp: string;
  provider: string;
  actionUrl?: string;
  carrierSid?: string;
}

export interface PhoneNotificationSettings {
  enabled: boolean;
  phoneNumber: string;
  channels: 'whatsapp' | 'sms' | 'both';
  countryCode: string;
  autoAlertOnDue: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  twilioWhatsAppFrom?: string;
  textbeeApiKey?: string;
  textbeeDeviceId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'meeting' | 'task' | 'email' | 'reminder' | 'ai';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
  status: 'executing' | 'pending_confirmation' | 'completed' | 'cancelled';
  result?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCall?: ToolCall;
  confirmationRequired?: boolean;
}

export interface ProductivityInsight {
  id: string;
  title: string;
  description: string;
  type: 'recommendation' | 'stat' | 'alert';
  metric?: string;
  actionText?: string;
  actionRoute?: string;
}

export interface IntegrationStatus {
  gmail: boolean;
  googleCalendar: boolean;
  googleTasks: boolean;
}

export interface UserSettings {
  theme: ThemeMode;
  aiModel: string;
  responseStyle: 'concise' | 'detailed' | 'professional';
  memoryEnabled: boolean;
  notifications: {
    email: boolean;
    task: boolean;
    calendar: boolean;
    ai: boolean;
    phone?: boolean;
    telegram?: boolean;
    whatsapp?: boolean;
    sms?: boolean;
  };
  phoneSettings?: PhoneNotificationSettings;
  telegramSettings?: TelegramNotificationSettings;
  integrations: IntegrationStatus;
}

export interface ActionHistoryItem {
  id: string;
  action: string;
  category: 'email' | 'task' | 'calendar' | 'reminder' | 'ai' | 'system';
  details: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  meta?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  pinned?: boolean;
  messageCount: number;
  messages: ChatMessage[];
}

export interface SearchResults {
  tasks: Task[];
  emails: Email[];
  events: CalendarEvent[];
  reminders: Reminder[];
  history?: ActionHistoryItem[];
}
