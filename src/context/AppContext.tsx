import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Task,
  Email,
  CalendarEvent,
  Reminder,
  NotificationItem,
  ChatMessage,
  UserSettings,
  SearchResults,
  ActionHistoryItem,
  ChatSession,
  PhoneDispatchLog,
  PhoneNotificationSettings,
  TelegramDispatchLog,
  TelegramNotificationSettings,
  TelegramReminderNotification
} from '../types';
import {
  GmailAuthStatus,
  getSavedGmailAuth,
  saveGmailAuth,
  clearGmailAuth,
  connectGmailAccount,
  sendEmailViaGmailApi,
  fetchLiveGmailMessages
} from '../lib/gmail';
import {
  NotificationPermissionState,
  getNotificationPermission,
  requestNotificationPermission,
  showReminderNotification,
  playNotificationSound,
  parseReminderDatetime,
  isNotificationSupported
} from '../lib/notifications';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface AppContextType {
  // Toast notifications
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;

  // Browser Notification & Alert State
  notificationPermission: NotificationPermissionState;
  requestBrowserNotificationPermission: () => Promise<NotificationPermissionState>;
  testBrowserNotification: () => void;
  soundAlertsEnabled: boolean;
  setSoundAlertsEnabled: (enabled: boolean) => void;
  dueReminders: Reminder[];
  quickCreateTestReminder: (seconds?: number) => Promise<Reminder | null>;

  // Gmail OAuth & Live API State
  gmailAuth: GmailAuthStatus;
  isGmailSyncing: boolean;
  connectGmail: () => Promise<boolean>;
  disconnectGmail: () => void;
  syncGmailInbox: () => Promise<void>;

  // Tasks
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  breakdownTask: (id: string) => Promise<string[]>;

  // Emails
  emails: Email[];
  fetchEmails: () => Promise<void>;
  sendEmail: (data: Partial<Email>) => Promise<Email | null>;
  updateEmail: (id: string, updates: Partial<Email>) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;
  generateAIEmailText: (
    prompt: string,
    mode: 'generate' | 'improve' | 'shorten' | 'professional' | 'friendly',
    originalText?: string
  ) => Promise<{ subject: string; body: string }>;

  // Calendar
  events: CalendarEvent[];
  fetchEvents: () => Promise<void>;
  createEvent: (data: Partial<CalendarEvent>) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  suggestFreeSlots: () => Promise<{ slot: string; confidence: string }[]>;

  // Reminders
  reminders: Reminder[];
  fetchReminders: () => Promise<void>;
  createReminder: (data: Partial<Reminder>) => Promise<Reminder | null>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // Telegram Bot Alerts (@NexaTaskAlertsBot)
  telegramSettings: TelegramNotificationSettings | null;
  telegramLogs: TelegramDispatchLog[];
  telegramNotifications: TelegramReminderNotification[];
  fetchTelegramSettings: () => Promise<void>;
  fetchTelegramLogs: () => Promise<void>;
  fetchTelegramNotifications: () => Promise<void>;
  acknowledgeTelegramNotification: (id: string) => Promise<void>;
  clearTelegramNotifications: () => Promise<void>;
  updateTelegramSettings: (updates: Partial<TelegramNotificationSettings>) => Promise<void>;
  sendTestTelegramMessage: (
    chatId?: string,
    message?: string
  ) => Promise<{ success: boolean; log?: TelegramDispatchLog; notification?: TelegramReminderNotification; error?: string }>;
  detectTelegramChat: (autoSave?: boolean) => Promise<{
    found: boolean;
    chatId?: string;
    username?: string;
    name?: string;
    allChats?: any[];
  }>;
  clearTelegramLogs: () => Promise<void>;

  // Phone & WhatsApp / SMS Notifications
  phoneSettings: PhoneNotificationSettings | null;
  phoneLogs: PhoneDispatchLog[];
  fetchPhoneLogs: () => Promise<void>;
  updatePhoneSettings: (updates: Partial<PhoneNotificationSettings>) => Promise<void>;
  sendTestPhoneMessage: (
    phoneNumber?: string,
    channel?: 'whatsapp' | 'sms' | 'both',
    message?: string
  ) => Promise<{ success: boolean; logs: PhoneDispatchLog[] }>;
  clearPhoneLogs: () => Promise<void>;
  dispatchReminderNow: (id: string) => Promise<void>;

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Chat / Assistant
  chatHistory: ChatMessage[];
  activeSessionId: string | null;
  activeSession: ChatSession | null;
  startNewChat: () => void;
  selectChatSession: (id: string) => Promise<void>;
  renameChatSession: (id: string, newTitle: string) => Promise<void>;
  togglePinChatSession: (id: string) => Promise<void>;
  sendMessageToAssistant: (
    userText?: string,
    forceExecuteTool?: { toolName: string; args: any }
  ) => Promise<void>;
  clearChatHistory: () => Promise<void>;
  chatSessions: ChatSession[];
  fetchChatSessions: () => Promise<void>;
  saveChatSession: (title?: string) => Promise<ChatSession | null>;
  deleteChatSession: (id: string) => Promise<void>;
  exportChatHistory: (format?: 'markdown' | 'txt' | 'json') => void;
  saveWorkspaceSnapshot: (title?: string) => Promise<boolean>;

  // Action & Activity History
  actionHistory: ActionHistoryItem[];
  fetchActionHistory: () => Promise<void>;
  clearActionHistory: () => Promise<void>;
  exportAllData: () => Promise<void>;

  // Settings
  settings: UserSettings | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;

  // Analytics
  analyticsData: {
    weeklyPerformance: { day: string; completed: number; pending: number }[];
    categoryDistribution: { category: string; count: number }[];
  };

  // Global Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResults;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Compose Modal
  isComposeEmailOpen: boolean;
  setIsComposeEmailOpen: (open: boolean) => void;
  composeEmailInitialData: Partial<Email> | null;
  setComposeEmailInitialData: (data: Partial<Email> | null) => void;

  // Real-Time Simulation
  simulateIncomingRealtimeEmail: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const cached = localStorage.getItem('nexa_chat_history');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSession = chatSessions.find((s) => s.id === activeSessionId) || null;
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>(() => {
    try {
      const cached = localStorage.getItem('nexa_action_history');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [telegramSettings, setTelegramSettings] = useState<TelegramNotificationSettings | null>(null);
  const [telegramLogs, setTelegramLogs] = useState<TelegramDispatchLog[]>([]);
  const [telegramNotifications, setTelegramNotifications] = useState<TelegramReminderNotification[]>([]);
  const [phoneSettings, setPhoneSettings] = useState<PhoneNotificationSettings | null>(null);
  const [phoneLogs, setPhoneLogs] = useState<PhoneDispatchLog[]>([]);

  // Gmail OAuth State
  const [gmailAuth, setGmailAuth] = useState<GmailAuthStatus>(getSavedGmailAuth());
  const [isGmailSyncing, setIsGmailSyncing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    tasks: [],
    emails: [],
    events: [],
    reminders: [],
    history: []
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isComposeEmailOpen, setIsComposeEmailOpen] = useState(false);
  const [composeEmailInitialData, setComposeEmailInitialData] = useState<Partial<Email> | null>(null);

  // Browser Notification & Sound Alert State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    getNotificationPermission()
  );
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexa_sound_alerts');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const alertedReminderIds = useRef<Set<string>>(new Set());

  // Synchronize sound alert preferences
  useEffect(() => {
    try {
      localStorage.setItem('nexa_sound_alerts', JSON.stringify(soundAlertsEnabled));
    } catch (e) {}
  }, [soundAlertsEnabled]);

  // Request browser notification permission
  const requestBrowserNotificationPermission = async (): Promise<NotificationPermissionState> => {
    const res = await requestNotificationPermission();
    setNotificationPermission(res);
    if (res === 'granted') {
      addToast('success', 'Browser Notifications Enabled', 'You will now receive desktop alerts when reminders are due.');
    } else if (res === 'denied') {
      addToast('warning', 'Notifications Blocked', 'Please allow notifications in your browser address bar settings to receive alerts.');
    }
    return res;
  };

  // Test Notification & Audio Tone Trigger
  const testBrowserNotification = () => {
    if (notificationPermission !== 'granted') {
      requestBrowserNotificationPermission().then((perm) => {
        if (perm === 'granted') {
          showReminderNotification({
            id: `test_${Date.now()}`,
            title: 'Sample Reminder Alert',
            datetime: 'Due Right Now',
            priority: 'high',
            playSound: soundAlertsEnabled,
            onClick: () => addToast('info', 'Notification Clicked', 'Nexa AI Reminder focused.')
          });
        }
      });
    } else {
      showReminderNotification({
        id: `test_${Date.now()}`,
        title: 'Sample Reminder Alert',
        datetime: 'Due Right Now',
        priority: 'high',
        playSound: soundAlertsEnabled,
        onClick: () => addToast('info', 'Notification Clicked', 'Nexa AI Reminder focused.')
      });
    }
    addToast('info', 'Test Alert Triggered', 'Dispatched browser notification & sound chime.');
  };

  // Quick 10-second test reminder
  const quickCreateTestReminder = async (seconds: number = 10): Promise<Reminder | null> => {
    const dueTime = new Date(Date.now() + seconds * 1000);
    const timeStr = dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isoStr = dueTime.toISOString();

    const created = await createReminder({
      title: `⚡ Quick Test Reminder (${seconds}s timer)`,
      datetime: isoStr,
      priority: 'high',
      completed: false
    });

    if (created) {
      addToast(
        'info',
        `Test Reminder Set for ${timeStr}`,
        `Wait ${seconds} seconds. You will see a browser notification & hear a sound alert!`
      );
    }
    return created;
  };

  // Persist chat and action history to localStorage as secondary backup
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      try {
        localStorage.setItem('nexa_chat_history', JSON.stringify(chatHistory));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }
  }, [chatHistory]);

  useEffect(() => {
    if (actionHistory && actionHistory.length > 0) {
      try {
        localStorage.setItem('nexa_action_history', JSON.stringify(actionHistory));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }
  }, [actionHistory]);

  // Toast Helper
  const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Data Fetching
  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.warn('Tasks fetch notice:', e);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (e) {
      console.warn('Emails fetch notice:', e);
    }
  };

  // Gmail OAuth Methods
  const connectGmail = async (): Promise<boolean> => {
    try {
      const outcome = await connectGmailAccount();

      if (outcome.success) {
        const updated = getSavedGmailAuth();
        setGmailAuth(updated);
        addToast(
          'success',
          'Gmail Connected',
          `Authorized as ${updated.userEmail || outcome.email}. Real-time sending and inbox synchronization enabled.`
        );
        await syncGmailInbox();
        return true;
      } else if (outcome.cancelled) {
        addToast(
          'info',
          'Google Sign-in Window Closed',
          'You can click Connect Gmail whenever you are ready to link your account.'
        );
        return false;
      } else {
        addToast('error', 'Gmail Connection Notice', outcome.error || 'Could not complete authorization.');
        return false;
      }
    } catch (err: any) {
      console.warn('Gmail connection notice:', err);
      addToast(
        'info',
        'Authorization Window Closed',
        'Click Connect Gmail to authorize real-time sending.'
      );
      return false;
    }
  };

  const disconnectGmail = () => {
    clearGmailAuth();
    setGmailAuth({ isConnected: false, userEmail: null, accessToken: null, expiresAt: null });
    addToast('info', 'Gmail Disconnected', 'Switched to local mail storage.');
  };

  const syncGmailInbox = async () => {
    const current = getSavedGmailAuth();
    if (!current.isConnected || !current.accessToken) {
      addToast('info', 'Connect Gmail', 'Please connect your Google account to sync live emails.');
      return;
    }

    setIsGmailSyncing(true);
    try {
      const liveEmails = await fetchLiveGmailMessages(current.accessToken, '', 15);
      if (liveEmails.length > 0) {
        setEmails((prev) => {
          const map = new Map<string, Email>();
          prev.forEach((e) => map.set(e.id, e));
          liveEmails.forEach((e) => map.set(e.id, e));
          return Array.from(map.values());
        });
        addToast('success', 'Gmail Synced', `Retrieved ${liveEmails.length} messages from your Gmail account.`);
      } else {
        addToast('info', 'Gmail Synced', 'No new messages found.');
      }
    } catch (e) {
      console.error('Gmail sync error:', e);
      addToast('error', 'Sync Notice', 'Unable to retrieve Gmail messages.');
    } finally {
      setIsGmailSyncing(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.warn('Events fetch notice:', e);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (e) {
      console.warn('Reminders fetch notice:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.warn('Notifications fetch notice:', e);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch('/api/chat/history');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setChatHistory(data);
        }
      }
    } catch (e) {
      console.warn('Chat history fetch notice:', e);
    }
  };

  const fetchChatSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setChatSessions(data);
        }
      }
    } catch (e) {
      console.warn('Chat sessions fetch notice:', e);
    }
  };

  const fetchActionHistory = async () => {
    try {
      const res = await fetch('/api/history/actions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setActionHistory(data);
        }
      }
    } catch (e) {
      console.warn('Action history fetch notice:', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.telegramSettings) {
          setTelegramSettings(data.telegramSettings);
        }
        if (data.phoneSettings) {
          setPhoneSettings(data.phoneSettings);
        }
      }
    } catch (e) {
      console.warn('Settings fetch notice:', e);
    }
  };

  const fetchTelegramSettings = async () => {
    try {
      const res = await fetch('/api/telegram/config');
      if (res.ok) {
        const data = await res.json();
        if (data.telegramSettings) {
          setTelegramSettings(data.telegramSettings);
        }
      }
    } catch (e) {
      console.warn('Telegram config fetch notice:', e);
    }
  };

  const fetchTelegramLogs = async () => {
    try {
      const res = await fetch('/api/telegram/logs');
      if (res.ok) {
        const data = await res.json();
        setTelegramLogs(data);
      }
    } catch (e) {
      console.warn('Telegram logs fetch error:', e);
    }
  };

  const fetchTelegramNotifications = async () => {
    try {
      const res = await fetch('/api/telegram/notifications');
      if (res.ok) {
        const data = await res.json();
        setTelegramNotifications(data);
      }
    } catch (e) {
      console.warn('Telegram notifications fetch error:', e);
    }
  };

  const acknowledgeTelegramNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/notifications/${id}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        await Promise.all([
          fetchTelegramNotifications(),
          fetchTelegramLogs(),
          fetchNotifications(),
          fetchActionHistory()
        ]);
        addToast('success', 'Reminder Acknowledged ✅', 'Telegram alert status updated to Acknowledged');
      }
    } catch (e) {
      addToast('error', 'Failed to acknowledge notification');
    }
  };

  const clearTelegramNotifications = async () => {
    try {
      await fetch('/api/telegram/notifications', { method: 'DELETE' });
      setTelegramNotifications([]);
      addToast('info', 'Telegram notification tracking logs cleared');
    } catch (e) {
      addToast('error', 'Failed to clear notifications');
    }
  };

  const updateTelegramSettings = async (updates: Partial<TelegramNotificationSettings>) => {
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramSettings(data.telegramSettings);
        if (settings) {
          setSettings({ ...settings, telegramSettings: data.telegramSettings });
        }
        addToast('success', 'Telegram Settings Saved', `Alerts linked to @${data.telegramSettings.botUsername || 'NexaTaskAlertsBot'}`);
      }
    } catch (e) {
      addToast('error', 'Failed to save Telegram settings');
    }
  };

  const detectTelegramChat = async (autoSave: boolean = true) => {
    try {
      const res = await fetch(`/api/telegram/detect-chat?autoSave=${autoSave}`);
      const data = await res.json();
      if (data.found && data.chatId) {
        await fetchTelegramSettings();
        await fetchTelegramLogs();
        await fetchTelegramNotifications();
        addToast(
          'success',
          'Telegram Connected! 🚀',
          `Detected Chat ID ${data.chatId} (${data.name || data.username || 'User'})`
        );
      } else {
        addToast(
          'info',
          'No Messages Detected Yet',
          'Open @NexaTaskAlertsBot on Telegram, tap Start or send a message, then click Detect again.'
        );
      }
      return data;
    } catch (e) {
      addToast('error', 'Failed to query Telegram updates');
      return { found: false };
    }
  };

  const sendTestTelegramMessage = async (
    chatId?: string,
    message?: string
  ): Promise<{ success: boolean; log?: TelegramDispatchLog; notification?: TelegramReminderNotification; error?: string }> => {
    try {
      const res = await fetch('/api/telegram/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message })
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([
          fetchTelegramLogs(),
          fetchTelegramNotifications(),
          fetchNotifications(),
          fetchActionHistory()
        ]);
        addToast(
          'success',
          '✈️ Telegram Alert Dispatched!',
          `Sent alert via @${telegramSettings?.botUsername || 'NexaTaskAlertsBot'} to Chat ${chatId || telegramSettings?.chatId || 'linked chat'}. Awaiting confirmation button tap.`
        );
        return { success: true, log: data.log, notification: data.notification };
      }
      addToast('error', 'Telegram Send Error', data.error || 'Failed to dispatch test message');
      return { success: false, error: data.error };
    } catch (e: any) {
      addToast('error', 'Network error sending test Telegram alert');
      return { success: false, error: e.message };
    }
  };

  const clearTelegramLogs = async () => {
    try {
      await fetch('/api/telegram/logs', { method: 'DELETE' });
      setTelegramLogs([]);
      addToast('info', 'Telegram delivery audit logs cleared');
    } catch (e) {
      addToast('error', 'Failed to clear Telegram logs');
    }
  };

  const fetchPhoneLogs = async () => {
    try {
      const res = await fetch('/api/phone/logs');
      if (res.ok) {
        const data = await res.json();
        setPhoneLogs(data);
      }
    } catch (e) {
      console.warn('Phone logs fetch error:', e);
    }
  };

  const updatePhoneSettings = async (updates: Partial<PhoneNotificationSettings>) => {
    try {
      const res = await fetch('/api/phone/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setPhoneSettings(data.phoneSettings);
        if (settings) {
          setSettings({ ...settings, phoneSettings: data.phoneSettings });
        }
        addToast('success', 'Phone Alert Preferences Saved', `Alerts set to ${data.phoneSettings.phoneNumber}`);
      }
    } catch (e) {
      addToast('error', 'Failed to save phone preferences');
    }
  };

  const sendTestPhoneMessage = async (
    phoneNumber?: string,
    channel: 'whatsapp' | 'sms' | 'both' = 'both',
    message?: string
  ): Promise<{ success: boolean; logs: PhoneDispatchLog[] }> => {
    try {
      const res = await fetch('/api/phone/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, channel, message })
      });
      const data = await res.json();
      if (data.success) {
        await fetchPhoneLogs();
        await fetchNotifications();
        await fetchActionHistory();
        addToast(
          'success',
          `📱 Test Alert Dispatched!`,
          `Sent ${channel.toUpperCase()} message to ${phoneNumber || phoneSettings?.phoneNumber || 'phone'}.`
        );
        return { success: true, logs: data.logs || [] };
      }
      addToast('error', 'Failed to dispatch test message');
      return { success: false, logs: [] };
    } catch (e) {
      addToast('error', 'Network error sending test phone alert');
      return { success: false, logs: [] };
    }
  };

  const clearPhoneLogs = async () => {
    try {
      await fetch('/api/phone/logs', { method: 'DELETE' });
      setPhoneLogs([]);
      addToast('info', 'Phone delivery audit logs cleared');
    } catch (e) {
      addToast('error', 'Failed to clear phone logs');
    }
  };

  const dispatchReminderNow = async (id: string) => {
    try {
      const rem = reminders.find((r) => r.id === id);
      if (rem) {
        showReminderNotification({
          id: rem.id,
          title: rem.title,
          datetime: 'Triggered Now',
          priority: rem.priority,
          playSound: soundAlertsEnabled,
          onClick: () => addToast('info', 'Reminder Opened', `"${rem.title}"`)
        });
      }

      const res = await fetch(`/api/reminders/${id}/dispatch-now`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await Promise.all([
          fetchReminders(),
          fetchTelegramLogs(),
          fetchTelegramNotifications(),
          fetchPhoneLogs(),
          fetchNotifications(),
          fetchActionHistory()
        ]);
        addToast('success', '✈️ Telegram & Screen Alert Dispatched', 'Instant alert sent to your Telegram app with acknowledgement tracking.');
      }
    } catch (e) {
      addToast('error', 'Failed to dispatch reminder now');
    }
  };

  const simulateIncomingRealtimeEmail = async () => {
    try {
      const res = await fetch('/api/emails/simulate-incoming', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.email) {
        await fetchEmails();
        await fetchNotifications();
        await fetchActionHistory();
        addToast('info', 'Real-Time Email Received', `From: ${data.email.senderName}`);
      }
    } catch (e) {
      addToast('error', 'Failed to simulate email');
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchEmails();
    fetchEvents();
    fetchReminders();
    fetchNotifications();
    fetchChatHistory();
    fetchChatSessions();
    fetchActionHistory();
    fetchSettings();
    fetchTelegramSettings();
    fetchTelegramLogs();
    fetchTelegramNotifications();
    fetchPhoneLogs();

    // Real-Time Sync Polling Engine (3.5 seconds interval)
    const interval = setInterval(() => {
      fetchEmails();
      fetchNotifications();
      fetchTasks();
      fetchActionHistory();
      fetchReminders();
      fetchTelegramLogs();
      fetchTelegramNotifications();
      fetchPhoneLogs();
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Scheduled Reminder Alert Engine (Checks every 1 second)
  useEffect(() => {
    const checkScheduledReminders = () => {
      const now = new Date();
      const dueList: Reminder[] = [];

      reminders.forEach((rem) => {
        if (rem.completed) return;

        const targetDate = parseReminderDatetime(rem.snoozedUntil || rem.datetime);
        if (!targetDate) return;

        // If target time has arrived or passed
        if (targetDate.getTime() <= now.getTime()) {
          dueList.push(rem);

          // If we haven't alerted for this reminder yet
          if (!alertedReminderIds.current.has(rem.id)) {
            alertedReminderIds.current.add(rem.id);

            // Trigger Browser Notification & Audio Chime
            showReminderNotification({
              id: rem.id,
              title: rem.title,
              datetime: rem.datetime,
              priority: rem.priority,
              playSound: soundAlertsEnabled,
              onClick: () => {
                addToast('info', 'Reminder Opened', `"${rem.title}"`);
              }
            });

            // Display in-app alert toast
            addToast('warning', `⏰ Reminder Due: ${rem.title}`, `Scheduled for: ${rem.datetime}`);

            // Dispatch persistent notification to notification drawer
            fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Reminder Due: ${rem.title}`,
                message: `Your scheduled reminder "${rem.title}" (${rem.datetime}) is due.`,
                type: 'reminder',
                link: '/reminders'
              })
            }).then(() => fetchNotifications()).catch(() => {});

            // Record in Action History audit trail
            fetch('/api/history/actions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'Reminder Alert Triggered',
                category: 'reminder',
                details: `Dispatched browser notification alert for "${rem.title}"`
              })
            }).then(() => fetchActionHistory()).catch(() => {});
          }
        }
      });

      setDueReminders(dueList);
    };

    checkScheduledReminders();
    const interval = setInterval(checkScheduledReminders, 1000);
    return () => clearInterval(interval);
  }, [reminders, soundAlertsEnabled]);

  // Live search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ tasks: [], emails: [], events: [], reminders: [] });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (e) {
        console.error(e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Tasks actions
  const createTask = async (task: Partial<Task>): Promise<Task | null> => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      const newTask = await res.json();
      await fetchTasks();
      await fetchNotifications();
      addToast('success', 'Task Created', `"${newTask.title}" added to your manager.`);
      return newTask;
    } catch (e) {
      addToast('error', 'Failed to create task');
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      await fetchTasks();
    } catch (e) {
      addToast('error', 'Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      await fetchTasks();
      addToast('info', 'Task Deleted');
    } catch (e) {
      addToast('error', 'Failed to delete task');
    }
  };

  const completeTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}/complete`, { method: 'POST' });
      await fetchTasks();
      addToast('success', 'Task Completed!');
    } catch (e) {
      addToast('error', 'Failed to complete task');
    }
  };

  const breakdownTask = async (id: string): Promise<string[]> => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return [];
    try {
      const res = await fetch('/api/ai/task-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, description: task.description })
      });
      const data = await res.json();
      const subtaskTitles: string[] = data.subtasks || [];
      const newSubtasks = subtaskTitles.map((stTitle, idx) => ({
        id: `st_ai_${Date.now()}_${idx}`,
        title: stTitle,
        completed: false
      }));

      await updateTask(id, { subtasks: [...(task.subtasks || []), ...newSubtasks] });
      addToast('success', 'AI Subtasks Generated', `Added ${newSubtasks.length} subtasks to "${task.title}".`);
      return subtaskTitles;
    } catch (e) {
      addToast('error', 'Failed to generate task breakdown');
      return [];
    }
  };

  // Emails actions
  const sendEmail = async (data: Partial<Email>): Promise<Email | null> => {
    try {
      let deliveredViaGmailApi = false;

      // Check if Gmail is connected and this is not a draft
      const currentAuth = getSavedGmailAuth();
      if (
        data.folder !== 'drafts' &&
        currentAuth.isConnected &&
        currentAuth.accessToken &&
        data.recipientEmail &&
        data.subject
      ) {
        try {
          await sendEmailViaGmailApi(currentAuth.accessToken, {
            to: data.recipientEmail,
            from: currentAuth.userEmail || undefined,
            subject: data.subject,
            body: data.body || '',
            cc: data.cc,
            bcc: data.bcc
          });
          deliveredViaGmailApi = true;
        } catch (apiErr: any) {
          console.warn('Direct Gmail API send error:', apiErr);
          if (
            apiErr?.message?.includes('401') ||
            apiErr?.message?.includes('UNAUTHENTICATED') ||
            apiErr?.message?.includes('invalid_token')
          ) {
            clearGmailAuth();
            setGmailAuth(getSavedGmailAuth());
            addToast('warning', 'Gmail Session Expired', 'Please reconnect Gmail to send to live inboxes.');
          } else {
            addToast('warning', 'Gmail API Notice', apiErr?.message || 'Delivering via queue.');
          }
        }
      }

      // Save email into application database (sent folder)
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          senderEmail: currentAuth.userEmail || undefined,
          folder: data.folder || 'sent'
        })
      });
      const newEmail = await res.json();
      await fetchEmails();
      await fetchNotifications();

      if (deliveredViaGmailApi) {
        addToast(
          'success',
          'Delivered to Real Gmail Inbox',
          `Dispatched in real time to ${data.recipientEmail} and saved in Sent emails!`
        );
      } else {
        addToast(
          'success',
          data.folder === 'drafts' ? 'Draft Saved' : 'Email Sent & Saved',
          `Subject: ${newEmail.subject}`
        );
      }

      return newEmail;
    } catch (e) {
      addToast('error', 'Unable to send email', 'Please check your connection or credentials.');
      return null;
    }
  };

  const updateEmail = async (id: string, updates: Partial<Email>) => {
    try {
      await fetch(`/api/emails/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      await fetchEmails();
    } catch (e) {
      addToast('error', 'Failed to update email');
    }
  };

  const deleteEmail = async (id: string) => {
    try {
      await fetch(`/api/emails/${id}`, { method: 'DELETE' });
      await fetchEmails();
      addToast('info', 'Email moved to Trash');
    } catch (e) {
      addToast('error', 'Failed to delete email');
    }
  };

  const generateAIEmailText = async (
    prompt: string,
    mode: 'generate' | 'improve' | 'shorten' | 'professional' | 'friendly',
    originalText?: string
  ) => {
    try {
      const res = await fetch('/api/ai/write-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode, originalText })
      });
      return await res.json();
    } catch (e) {
      addToast('error', 'AI Email generation unavailable');
      return { subject: 'Project Update', body: prompt };
    }
  };

  // Calendar actions
  const createEvent = async (data: Partial<CalendarEvent>): Promise<CalendarEvent | null> => {
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const newEvent = await res.json();
      await fetchEvents();
      await fetchNotifications();
      addToast('success', 'Event Scheduled', `"${newEvent.title}" on ${newEvent.date}`);
      return newEvent;
    } catch (e) {
      addToast('error', 'Failed to schedule event');
      return null;
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      await fetch(`/api/calendar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      await fetchEvents();
      addToast('success', 'Event Updated');
    } catch (e) {
      addToast('error', 'Failed to update event');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      await fetchEvents();
      addToast('info', 'Event Removed');
    } catch (e) {
      addToast('error', 'Failed to remove event');
    }
  };

  const suggestFreeSlots = async () => {
    try {
      const res = await fetch('/api/ai/suggest-schedule');
      const data = await res.json();
      return data.suggestions || [];
    } catch (e) {
      return [];
    }
  };

  // Reminders actions
  const createReminder = async (data: Partial<Reminder>): Promise<Reminder | null> => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const newRem = await res.json();
      await fetchReminders();
      await fetchNotifications();
      addToast('success', 'Reminder Set', `"${newRem.title}"`);
      return newRem;
    } catch (e) {
      addToast('error', 'Failed to set reminder');
      return null;
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      if (updates.datetime || updates.snoozedUntil || updates.completed !== undefined) {
        alertedReminderIds.current.delete(id);
      }
      await fetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      await fetchReminders();
    } catch (e) {
      addToast('error', 'Failed to update reminder');
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      alertedReminderIds.current.delete(id);
      setDueReminders((prev) => prev.filter((r) => r.id !== id));
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      await fetchReminders();
      addToast('info', 'Reminder deleted');
    } catch (e) {
      addToast('error', 'Failed to delete reminder');
    }
  };

  // Notifications actions
  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      await fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      await fetchNotifications();
      addToast('info', 'All notifications marked as read');
    } catch (e) {
      console.error(e);
    }
  };

  // Chat / Assistant actions
  const startNewChat = () => {
    setActiveSessionId(null);
    const welcomeMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: "Hello Saniya! I'm **Nexa AI**, your personal productivity assistant. How can I help you organize tasks, manage your calendar, or plan your schedule today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory([welcomeMsg]);
    addToast('info', 'New Chat Started', 'Ready for your new conversation.');
  };

  const selectChatSession = async (id: string) => {
    try {
      setActiveSessionId(id);
      const res = await fetch(`/api/chat/sessions/${id}`);
      if (res.ok) {
        const session: ChatSession = await res.json();
        if (session && Array.isArray(session.messages)) {
          setChatHistory(session.messages);
          await fetch(`/api/chat/sessions/${id}/restore`, { method: 'POST' });
        }
      } else {
        const found = chatSessions.find((s) => s.id === id);
        if (found && Array.isArray(found.messages)) {
          setChatHistory(found.messages);
        }
      }
    } catch (e) {
      console.error('Failed to select chat session', e);
    }
  };

  const renameChatSession = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        await fetchChatSessions();
        addToast('success', 'Session Renamed', `Updated to "${newTitle}"`);
      }
    } catch (e) {
      addToast('error', 'Failed to rename chat session');
    }
  };

  const togglePinChatSession = async (id: string) => {
    try {
      const current = chatSessions.find((s) => s.id === id);
      const res = await fetch(`/api/chat/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !current?.pinned })
      });
      if (res.ok) {
        await fetchChatSessions();
        addToast('info', current?.pinned ? 'Chat unpinned' : 'Chat pinned to top');
      }
    } catch (e) {
      addToast('error', 'Failed to update pin');
    }
  };

  const sendMessageToAssistant = async (
    userText?: string,
    forceExecuteTool?: { toolName: string; args: any }
  ) => {
    if (userText) {
      const tempMsg: ChatMessage = {
        id: `temp_${Date.now()}`,
        role: 'user',
        content: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory((prev) => [...prev, tempMsg]);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, forceExecuteTool, sessionId: activeSessionId })
      });
      const data = await res.json();

      if (data.sessionId && data.sessionId !== activeSessionId) {
        setActiveSessionId(data.sessionId);
      }

      // Refresh all dependent entities in background as tool calls might have changed emails/tasks/events
      await Promise.all([
        fetchChatHistory(),
        fetchChatSessions(),
        fetchActionHistory(),
        fetchTasks(),
        fetchEmails(),
        fetchEvents(),
        fetchReminders(),
        fetchNotifications()
      ]);

      if (data.toolCall?.status === 'completed') {
        addToast('success', 'Action Executed', `Tool ${data.toolCall.name} executed.`);
      }
    } catch (e) {
      addToast('error', 'AI Assistant Error', 'Unable to reach assistant service.');
    }
  };

  const clearChatHistory = async () => {
    try {
      await fetch('/api/chat/history', { method: 'DELETE' });
      setActiveSessionId(null);
      await fetchChatHistory();
      await fetchChatSessions();
      await fetchActionHistory();
      addToast('info', 'Chat history archived & cleared');
    } catch (e) {
      addToast('error', 'Failed to clear chat history');
    }
  };

  const saveChatSession = async (title?: string): Promise<ChatSession | null> => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      await fetchChatSessions();
      await fetchActionHistory();
      addToast('success', 'Conversation Session Saved', `Archived as "${data.title}"`);
      return data;
    } catch (e) {
      addToast('error', 'Failed to save session');
      return null;
    }
  };

  const deleteChatSession = async (id: string) => {
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      await fetchChatSessions();
      addToast('info', 'Session deleted from archives');
    } catch (e) {
      addToast('error', 'Failed to delete session');
    }
  };

  const saveWorkspaceSnapshot = async (title?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/workspace/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        await Promise.all([
          fetchChatSessions(),
          fetchTasks(),
          fetchEvents(),
          fetchReminders(),
          fetchActionHistory(),
          fetchNotifications()
        ]);
        addToast('success', 'Workspace Saved', 'Chat, tasks, and calendar schedule backed up successfully.');
        return true;
      }
      return false;
    } catch (e) {
      addToast('error', 'Failed to save workspace snapshot');
      return false;
    }
  };

  const clearActionHistory = async () => {
    try {
      await fetch('/api/history/actions', { method: 'DELETE' });
      setActionHistory([]);
      try {
        localStorage.removeItem('nexa_action_history');
      } catch (e) {}
      addToast('info', 'Action history logs cleared');
    } catch (e) {
      addToast('error', 'Failed to clear action history');
    }
  };

  const exportChatHistory = (format: 'markdown' | 'txt' | 'json' = 'markdown') => {
    if (!chatHistory || chatHistory.length === 0) {
      addToast('info', 'No chat history to export');
      return;
    }

    let content = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (format === 'json') {
      content = JSON.stringify(chatHistory, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'markdown') {
      mimeType = 'text/markdown';
      extension = 'md';
      content = `# Nexa AI Conversation Transcript\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
      chatHistory.forEach((msg) => {
        const sender = msg.role === 'user' ? '👤 **You**' : '✨ **Nexa AI**';
        content += `### ${sender} (${msg.timestamp})\n${msg.content}\n\n`;
        if (msg.toolCall) {
          content += `> 🛠️ **Tool Executed:** \`${msg.toolCall.name}\` (${msg.toolCall.status})\n> \`\`\`json\n> ${JSON.stringify(msg.toolCall.args, null, 2)}\n> \`\`\`\n\n`;
        }
      });
    } else {
      content = `Nexa AI Chat Transcript - ${new Date().toLocaleString()}\n\n`;
      chatHistory.forEach((msg) => {
        content += `[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      });
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexa-chat-history-${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('success', 'History Exported', `Saved as .${extension} file`);
  };

  const exportAllData = async () => {
    try {
      const res = await fetch('/api/history/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexa-full-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Full Backup Downloaded', 'All history, tasks, emails, and audit logs exported.');
    } catch (e) {
      addToast('error', 'Export Failed', 'Unable to generate full backup.');
    }
  };

  // Settings
  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const newSettings = await res.json();
      setSettings(newSettings);
      addToast('success', 'Settings Saved');
    } catch (e) {
      addToast('error', 'Failed to save settings');
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        gmailAuth,
        isGmailSyncing,
        connectGmail,
        disconnectGmail,
        syncGmailInbox,
        tasks,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        breakdownTask,
        emails,
        fetchEmails,
        sendEmail,
        updateEmail,
        deleteEmail,
        generateAIEmailText,
        events,
        fetchEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        suggestFreeSlots,
        reminders,
        fetchReminders,
        createReminder,
        updateReminder,
        deleteReminder,
        telegramSettings,
        telegramLogs,
        telegramNotifications,
        fetchTelegramSettings,
        fetchTelegramLogs,
        fetchTelegramNotifications,
        acknowledgeTelegramNotification,
        clearTelegramNotifications,
        updateTelegramSettings,
        sendTestTelegramMessage,
        detectTelegramChat,
        clearTelegramLogs,
        phoneSettings,
        phoneLogs,
        fetchPhoneLogs,
        updatePhoneSettings,
        sendTestPhoneMessage,
        clearPhoneLogs,
        dispatchReminderNow,
        notificationPermission,
        requestBrowserNotificationPermission,
        testBrowserNotification,
        soundAlertsEnabled,
        setSoundAlertsEnabled,
        dueReminders,
        quickCreateTestReminder,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        chatHistory,
        activeSessionId,
        activeSession,
        startNewChat,
        selectChatSession,
        renameChatSession,
        togglePinChatSession,
        sendMessageToAssistant,
        clearChatHistory,
        chatSessions,
        fetchChatSessions,
        saveChatSession,
        deleteChatSession,
        exportChatHistory,
        saveWorkspaceSnapshot,
        actionHistory,
        fetchActionHistory,
        clearActionHistory,
        exportAllData,
        settings,
        updateSettings,
        analyticsData: {
          weeklyPerformance: [
            { day: 'Mon', completed: 4, pending: 2 },
            { day: 'Tue', completed: 6, pending: 1 },
            { day: 'Wed', completed: 8, pending: 3 },
            { day: 'Thu', completed: 5, pending: 2 },
            { day: 'Fri', completed: 9, pending: 0 },
            { day: 'Sat', completed: 3, pending: 1 },
            { day: 'Sun', completed: 2, pending: 0 }
          ],
          categoryDistribution: [
            { category: 'AI Dev', count: 8 },
            { category: 'Academic', count: 5 },
            { category: 'Client', count: 4 },
            { category: 'Study', count: 6 },
            { category: 'Career', count: 3 }
          ]
        },
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearchOpen,
        setIsSearchOpen,
        isComposeEmailOpen,
        setIsComposeEmailOpen,
        composeEmailInitialData,
        setComposeEmailInitialData,
        simulateIncomingRealtimeEmail
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
