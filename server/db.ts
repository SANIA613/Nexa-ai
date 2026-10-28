import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  StoredUser,
  AuthResponse,
  Task,
  Email,
  CalendarEvent,
  Reminder,
  NotificationItem,
  ChatMessage,
  UserSettings,
  SearchResults,
  ProductivityInsight,
  ActionHistoryItem,
  ChatSession,
  PhoneDispatchLog,
  PhoneNotificationSettings,
  TelegramDispatchLog,
  TelegramNotificationSettings,
  TelegramReminderNotification,
  TelegramNotificationStatus
} from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'nexa_db.json');

export interface DatabaseSchema {
  user: User;
  users?: StoredUser[];
  tasks: Task[];
  emails: Email[];
  events: CalendarEvent[];
  reminders: Reminder[];
  notifications: NotificationItem[];
  chatHistory: ChatMessage[];
  chatSessions: ChatSession[];
  actionHistory: ActionHistoryItem[];
  phoneDispatchLogs: PhoneDispatchLog[];
  telegramDispatchLogs?: TelegramDispatchLog[];
  telegramNotifications?: TelegramReminderNotification[];
  settings: UserSettings[];
}

export const defaultUser: User = {
  id: 'usr_1',
  name: 'Saniya',
  email: 'saniyalinkedin613@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  role: 'AI & Software Developer'
};

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_nexa_salt_2026').digest('hex');
}

export function createAuthToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.SESSION_SECRET || 'nexa_session_secret_2026')
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifyAuthToken(token: string): { userId: string; email: string; name: string } | null {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const [data, signature] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', process.env.SESSION_SECRET || 'nexa_session_secret_2026')
      .update(data)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export const defaultStoredUsers: StoredUser[] = [
  {
    ...defaultUser,
    passwordHash: hashPassword('password123'),
    createdAt: new Date().toISOString()
  }
];

const defaultPhoneSettings: PhoneNotificationSettings = {
  enabled: true,
  phoneNumber: '+1 (555) 382-9104',
  channels: 'both',
  countryCode: '+1',
  autoAlertOnDue: true
};

export const defaultTelegramSettings: TelegramNotificationSettings = {
  enabled: true,
  botToken: '8711965885:AAEtgT1w0S1NK_aH_aH_djPV_JWr0Pz5e5s',
  botUsername: 'NexaTaskAlertsBot',
  chatId: '',
  telegramUsername: '',
  autoAlertOnDue: true
};

const defaultSettings: UserSettings = {
  theme: 'dark',
  aiModel: 'gemini-3.6-flash',
  responseStyle: 'concise',
  memoryEnabled: true,
  notifications: {
    email: true,
    task: true,
    calendar: true,
    ai: true,
    phone: false,
    telegram: true,
    whatsapp: false,
    sms: false
  },
  phoneSettings: defaultPhoneSettings,
  telegramSettings: defaultTelegramSettings,
  integrations: {
    gmail: true,
    googleCalendar: true,
    googleTasks: true
  }
};

const getTodayDate = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const initialTasks: Task[] = [
  {
    id: 'task_1',
    title: 'Complete AI chatbot application',
    description: 'Implement tool calling architecture and frontend dashboard for Nexa AI',
    priority: 'high',
    status: 'in_progress',
    dueDate: getTodayDate(0),
    tags: ['AI', 'Project', 'Dev'],
    createdAt: getTodayDate(-2),
    subtasks: [
      { id: 'st_1', title: 'Define requirements', completed: true },
      { id: 'st_2', title: 'Design UI', completed: true },
      { id: 'st_3', title: 'Create backend & API routes', completed: true },
      { id: 'st_4', title: 'Integrate Gemini Tool Calling API', completed: false },
      { id: 'st_5', title: 'Test chatbot voice & actions', completed: false },
      { id: 'st_6', title: 'Deploy application', completed: false }
    ]
  },
  {
    id: 'task_2',
    title: 'Submit internship report',
    description: 'Finalize quarterly performance summary and submit to university portal',
    priority: 'high',
    status: 'todo',
    dueDate: getTodayDate(1),
    tags: ['Internship', 'Academic'],
    createdAt: getTodayDate(-1),
    subtasks: [
      { id: 'st_21', title: 'Compile activity log', completed: true },
      { id: 'st_22', title: 'Get mentor signoff', completed: false },
      { id: 'st_23', title: 'Upload PDF to portal', completed: false }
    ]
  },
  {
    id: 'task_3',
    title: 'Study Machine Learning notes',
    description: 'Review transformers, attention mechanisms and fine-tuning techniques',
    priority: 'medium',
    status: 'in_progress',
    dueDate: getTodayDate(2),
    tags: ['Study', 'ML'],
    createdAt: getTodayDate(-3)
  },
  {
    id: 'task_4',
    title: 'Update software engineer resume',
    description: 'Add recent full-stack React + Gemini AI projects and published open source tools',
    priority: 'low',
    status: 'completed',
    dueDate: getTodayDate(-1),
    tags: ['Career'],
    createdAt: getTodayDate(-5)
  },
  {
    id: 'task_5',
    title: 'Prepare demo deck for client meeting',
    description: 'Create slide outline highlighting AI agent features and performance benchmarks',
    priority: 'high',
    status: 'todo',
    dueDate: getTodayDate(0),
    tags: ['Client', 'Presentation'],
    createdAt: getTodayDate(0)
  }
];

const initialEmails: Email[] = [
  {
    id: 'em_1',
    senderName: 'Prof. Sharma',
    senderEmail: 'sharma@university.edu',
    recipientEmail: 'saniyalinkedin613@gmail.com',
    subject: 'Project Submission & Extension Request',
    body: 'Hello Saniya, regarding your request for the Python project extension, please ensure you submit the final repository link by tomorrow evening 6 PM. Let me know if you run into any blocker.',
    folder: 'inbox',
    read: false,
    starred: true,
    timestamp: '10:15 AM Today',
    attachments: [{ name: 'Project_Rubric_v2.pdf', size: '1.2 MB' }]
  },
  {
    id: 'em_2',
    senderName: 'Rahul Verma',
    senderEmail: 'rahul.verma@techcorp.com',
    recipientEmail: 'saniyalinkedin613@gmail.com',
    subject: 'Meeting Confirmation: AI System Architecture',
    body: 'Hi Saniya, looking forward to our session tomorrow. Let us discuss integrating vector embeddings and multi-modal tool routing for the platform.',
    folder: 'inbox',
    read: false,
    starred: false,
    timestamp: '08:30 AM Today'
  },
  {
    id: 'em_3',
    senderName: 'TechCorp HR Team',
    senderEmail: 'careers@techcorp.com',
    recipientEmail: 'saniyalinkedin613@gmail.com',
    subject: 'Internship Performance Review & Next Steps',
    body: 'Dear Saniya, congratulations on an exceptional performance during your summer internship. Attached is your official evaluation letter.',
    folder: 'inbox',
    read: true,
    starred: true,
    timestamp: 'Yesterday',
    attachments: [{ name: 'Internship_Evaluation_Letter.pdf', size: '450 KB' }]
  },
  {
    id: 'em_4',
    senderName: 'Saniya',
    senderEmail: 'saniyalinkedin613@gmail.com',
    recipientEmail: 'sharma@university.edu',
    subject: 'Re: Project Submission Status Update',
    body: 'Dear Professor Sharma, thank you for the feedback. I am completing the final AI tool calling modules and will submit the project repository before 6 PM tomorrow.',
    folder: 'sent',
    read: true,
    starred: false,
    timestamp: 'Yesterday'
  },
  {
    id: 'em_5',
    senderName: 'Saniya',
    senderEmail: 'saniyalinkedin613@gmail.com',
    recipientEmail: 'team@aistudio.io',
    subject: 'Draft: Nexa AI Tool Calling Integration Architecture',
    body: 'Hi Team, here is the draft outline for the new tool-calling agent framework...',
    folder: 'drafts',
    read: true,
    starred: false,
    timestamp: '2 days ago'
  }
];

const initialEvents: CalendarEvent[] = [
  {
    id: 'evt_1',
    title: 'Team Sync & Standup',
    description: 'Daily team sync on Nexa AI sprint goals and backend route setup',
    date: getTodayDate(0),
    startTime: '09:00',
    endTime: '09:45',
    attendees: ['rahul.verma@techcorp.com', 'dev.team@techcorp.com'],
    location: 'Google Meet',
    reminderMinutesBefore: 15,
    color: '#3B82F6'
  },
  {
    id: 'evt_2',
    title: 'Project Deep Dive & Code Review',
    description: 'Reviewing AI tool execution engine and React state handlers',
    date: getTodayDate(0),
    startTime: '11:30',
    endTime: '12:30',
    attendees: ['sharma@university.edu'],
    location: 'Lab 402 / Online',
    reminderMinutesBefore: 15,
    color: '#10B981'
  },
  {
    id: 'evt_3',
    title: 'Interview Preparation Session',
    description: 'System design mock interview and algorithm practice',
    date: getTodayDate(0),
    startTime: '14:00',
    endTime: '15:00',
    attendees: ['mentor@techprep.io'],
    location: 'Zoom',
    reminderMinutesBefore: 30,
    color: '#8B5CF6'
  },
  {
    id: 'evt_4',
    title: 'Client Meeting — Nexa Product Demo',
    description: 'Demonstrate natural language email, task, calendar scheduling assistant',
    date: getTodayDate(0),
    startTime: '16:00',
    endTime: '17:00',
    attendees: ['client@enterprise.com', 'rahul.verma@techcorp.com'],
    location: 'Google Meet',
    reminderMinutesBefore: 30,
    color: '#F59E0B'
  },
  {
    id: 'evt_5',
    title: 'Strategy & Roadmap Planning',
    description: 'Planning feature roadmap for next sprint',
    date: getTodayDate(1),
    startTime: '15:00',
    endTime: '16:00',
    attendees: ['rahul.verma@techcorp.com'],
    location: 'Google Meet',
    reminderMinutesBefore: 30,
    color: '#EC4899'
  }
];

const initialReminders: Reminder[] = [
  {
    id: 'rem_1',
    title: 'Submit Python project assignment at 8 PM',
    datetime: `${getTodayDate(0)}T20:00:00`,
    priority: 'high',
    completed: false,
    relatedType: 'task',
    relatedId: 'task_1'
  },
  {
    id: 'rem_2',
    title: 'Remind 30 mins before 4 PM Client Meeting',
    datetime: `${getTodayDate(0)}T15:30:00`,
    priority: 'high',
    completed: false,
    relatedType: 'event',
    relatedId: 'evt_4'
  },
  {
    id: 'rem_3',
    title: 'Review Machine Learning lecture notes',
    datetime: `${getTodayDate(1)}T10:00:00`,
    priority: 'medium',
    completed: false
  }
];

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'Client Meeting in 30 minutes',
    message: 'Nexa Product Demo with client@enterprise.com starts at 4:00 PM',
    type: 'meeting',
    timestamp: '10 mins ago',
    read: false,
    link: '/calendar'
  },
  {
    id: 'notif_2',
    title: 'Task Deadline Approaching',
    message: 'Prepare demo deck for client meeting is due today',
    type: 'task',
    timestamp: '1 hour ago',
    read: false,
    link: '/tasks'
  },
  {
    id: 'notif_3',
    title: 'New Email Received',
    message: 'Prof. Sharma sent "Project Submission & Extension Request"',
    type: 'email',
    timestamp: '2 hours ago',
    read: true,
    link: '/email'
  },
  {
    id: 'notif_4',
    title: 'AI Insight Available',
    message: 'You have a free 2-hour slot this afternoon at 2:00 PM.',
    type: 'ai',
    timestamp: '3 hours ago',
    read: true,
    link: '/analytics'
  }
];

const initialChatHistory: ChatMessage[] = [
  {
    id: 'msg_1',
    role: 'assistant',
    content: "Hello Saniya! I'm **Nexa AI**, your personal productivity assistant. How can I help you organize your tasks, send emails, schedule meetings, or manage reminders today?",
    timestamp: '08:00 AM'
  }
];

const initialChatSessions: ChatSession[] = [
  {
    id: 'session_1',
    title: 'AI Project Task Breakdown & Schedule',
    createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    updatedAt: new Date().toISOString(),
    pinned: true,
    messageCount: 4,
    messages: [
      {
        id: 'msg_s1_1',
        role: 'user',
        content: 'Can you break down my AI chatbot task and schedule dedicated coding blocks for today and tomorrow?',
        timestamp: '10:15 AM'
      },
      {
        id: 'msg_s1_2',
        role: 'assistant',
        content: "I've analyzed your task **Complete AI chatbot application**. Here is the structured roadmap:\n\n1. **Subtask 1:** Integrate Gemini Tool Calling API (High priority)\n2. **Subtask 2:** Build Voice & Chat UI with persistent history\n3. **Subtask 3:** Connect Calendar & Task sync engine\n\nI've scheduled a 2-hour deep work focus session for today from 2:00 PM to 4:00 PM and added reminder alerts.",
        timestamp: '10:15 AM',
        toolCall: {
          name: 'create_calendar_event',
          args: { title: 'Deep Work: AI Chatbot Development', date: 'today', startTime: '14:00', endTime: '16:00' },
          status: 'completed',
          result: { success: true, message: 'Scheduled deep work block on Calendar.' }
        }
      },
      {
        id: 'msg_s1_3',
        role: 'user',
        content: 'Great! Also remind me 15 minutes before the session starts.',
        timestamp: '10:16 AM'
      },
      {
        id: 'msg_s1_4',
        role: 'assistant',
        content: 'Done! I have set a high-priority reminder for 1:45 PM today with browser chime notification.',
        timestamp: '10:16 AM',
        toolCall: {
          name: 'create_reminder',
          args: { title: 'Upcoming Deep Work Session in 15 mins', datetime: `${getTodayDate(0)}T13:45:00`, priority: 'high' },
          status: 'completed',
          result: { success: true, message: 'Reminder set successfully.' }
        }
      }
    ]
  },
  {
    id: 'session_2',
    title: 'Rahul Client Meeting & Schedule Sync',
    createdAt: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    pinned: false,
    messageCount: 3,
    messages: [
      {
        id: 'msg_s2_1',
        role: 'user',
        content: 'Schedule a meeting with Rahul tomorrow at 3 PM and draft an invitation email.',
        timestamp: 'Yesterday at 3:30 PM'
      },
      {
        id: 'msg_s2_2',
        role: 'assistant',
        content: "I have scheduled **Meeting with Rahul** for tomorrow at 3:00 PM - 4:00 PM on Google Meet, and drafted the confirmation email.",
        timestamp: 'Yesterday at 3:30 PM',
        toolCall: {
          name: 'create_calendar_event',
          args: { title: 'Meeting with Rahul', date: 'tomorrow', startTime: '15:00', endTime: '16:00', attendees: ['rahul.verma@techcorp.com'] },
          status: 'completed'
        }
      },
      {
        id: 'msg_s2_3',
        role: 'assistant',
        content: "I've prepared the email to **rahul.verma@techcorp.com**. Would you like me to dispatch it?",
        timestamp: 'Yesterday at 3:31 PM',
        confirmationRequired: true,
        toolCall: {
          name: 'send_email',
          args: { recipientEmail: 'rahul.verma@techcorp.com', subject: 'Sync on Project Deliverables', body: 'Hi Rahul, confirming our scheduled sync tomorrow at 3 PM.' },
          status: 'completed'
        }
      }
    ]
  },
  {
    id: 'session_3',
    title: 'Machine Learning Study & Weekly Goals',
    createdAt: new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    pinned: false,
    messageCount: 2,
    messages: [
      {
        id: 'msg_s3_1',
        role: 'user',
        content: 'Create a study task for Machine Learning transformer architectures and plan my weekly study intervals.',
        timestamp: '3 days ago'
      },
      {
        id: 'msg_s3_2',
        role: 'assistant',
        content: "Created task **Study Machine Learning notes** with due date in 2 days. Suggested 45-minute Pomodoro intervals each evening.",
        timestamp: '3 days ago',
        toolCall: {
          name: 'create_task',
          args: { title: 'Study Machine Learning notes', priority: 'medium', dueDate: getTodayDate(2), tags: ['Study', 'ML'] },
          status: 'completed'
        }
      }
    ]
  }
];

const initialActionHistory: ActionHistoryItem[] = [
  {
    id: 'act_1',
    action: 'Email Dispatched',
    category: 'email',
    details: 'Sent "Project Submission Status Update" to Prof. Sharma (sharma@university.edu)',
    timestamp: 'Yesterday at 4:30 PM',
    status: 'success'
  },
  {
    id: 'act_2',
    action: 'Calendar Event Scheduled',
    category: 'calendar',
    details: 'Scheduled "Client Meeting — Nexa Product Demo" for today at 4:00 PM',
    timestamp: 'Today at 09:15 AM',
    status: 'success'
  },
  {
    id: 'act_3',
    action: 'Task Completed',
    category: 'task',
    details: 'Marked "Update software engineer resume" as completed',
    timestamp: 'Yesterday at 2:10 PM',
    status: 'success'
  },
  {
    id: 'act_4',
    action: 'Reminder Created',
    category: 'reminder',
    details: 'Created high-priority reminder for Python project submission',
    timestamp: 'Today at 10:00 AM',
    status: 'success'
  }
];

export function normalizeDate(input?: string): string {
  if (!input) return new Date().toISOString().split('T')[0];
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Handle ISO strings like 2026-08-14T00:00:00 or slashed dates
  const cleanPart = trimmed.split('T')[0];
  const parts = cleanPart.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

export class LocalDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    const defaultData: DatabaseSchema = {
      user: defaultUser,
      users: [...defaultStoredUsers],
      tasks: initialTasks.map((t) => ({ ...t, userId: 'usr_1' })),
      emails: initialEmails,
      events: initialEvents,
      reminders: initialReminders.map((r) => ({ ...r, userId: 'usr_1' })),
      notifications: initialNotifications.map((n) => ({ ...n, userId: 'usr_1' })),
      chatHistory: initialChatHistory,
      chatSessions: initialChatSessions,
      actionHistory: initialActionHistory,
      phoneDispatchLogs: [],
      settings: [{ ...defaultSettings, userId: 'usr_1' }]
    };

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        // Multi-User Accounts list
        const storedUsers: StoredUser[] = Array.isArray(parsed.users) && parsed.users.length > 0
          ? parsed.users
          : [...defaultStoredUsers];
        
        // Ensure default demo user exists
        if (!storedUsers.some((u) => u.email.toLowerCase() === defaultUser.email.toLowerCase() || u.id === defaultUser.id)) {
          storedUsers.unshift({
            ...defaultUser,
            passwordHash: hashPassword('password123'),
            createdAt: new Date().toISOString()
          });
        }

        const rawSettings = Array.isArray(parsed.settings) && parsed.settings.length > 0
          ? parsed.settings
          : [{ ...defaultSettings, userId: 'usr_1' }];
        
        const loadedSettings: UserSettings[] = rawSettings.map((s: any) => ({
          ...defaultSettings,
          ...s,
          userId: s.userId || 'usr_1',
          notifications: {
            ...defaultSettings.notifications,
            ...(s.notifications || {})
          },
          phoneSettings: {
            ...defaultPhoneSettings,
            ...(s.phoneSettings || {})
          },
          telegramSettings: {
            ...defaultTelegramSettings,
            ...(s.telegramSettings || {})
          },
          integrations: {
            ...defaultSettings.integrations,
            ...(s.integrations || {})
          }
        }));

        const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : initialTasks;
        const normalizedTasks: Task[] = rawTasks.map((t: any) => ({
          ...t,
          userId: t.userId || 'usr_1',
          dueDate: normalizeDate(t.dueDate)
        }));

        const rawReminders = Array.isArray(parsed.reminders) ? parsed.reminders : initialReminders;
        const normalizedReminders: Reminder[] = rawReminders.map((r: any) => ({
          ...r,
          userId: r.userId || 'usr_1'
        }));

        const rawNotifications = Array.isArray(parsed.notifications) ? parsed.notifications : initialNotifications;
        const normalizedNotifications: NotificationItem[] = rawNotifications.map((n: any) => ({
          ...n,
          userId: n.userId || 'usr_1'
        }));

        const merged: DatabaseSchema = {
          user: parsed.user || defaultUser,
          users: storedUsers,
          tasks: normalizedTasks,
          emails: Array.isArray(parsed.emails) ? parsed.emails : initialEmails,
          events: Array.isArray(parsed.events) ? parsed.events : initialEvents,
          reminders: normalizedReminders,
          notifications: normalizedNotifications,
          chatHistory: Array.isArray(parsed.chatHistory) && parsed.chatHistory.length > 0 ? parsed.chatHistory : initialChatHistory,
          chatSessions: Array.isArray(parsed.chatSessions) && parsed.chatSessions.length > 0 ? parsed.chatSessions : initialChatSessions,
          actionHistory: Array.isArray(parsed.actionHistory) && parsed.actionHistory.length > 0 ? parsed.actionHistory : initialActionHistory,
          phoneDispatchLogs: Array.isArray(parsed.phoneDispatchLogs) ? parsed.phoneDispatchLogs : [],
          telegramDispatchLogs: Array.isArray(parsed.telegramDispatchLogs) ? parsed.telegramDispatchLogs : [],
          telegramNotifications: Array.isArray(parsed.telegramNotifications) ? parsed.telegramNotifications : [],
          settings: loadedSettings
        };
        // Normalize any existing event dates
        merged.events = merged.events.map((e) => ({ ...e, date: normalizeDate(e.date) }));
        return merged;
      }
    } catch (e) {
      console.error('Failed to read database file, initializing defaults:', e);
    }

    this.saveData(defaultData);
    return defaultData;
  }

  private saveData(data: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // --- USER & AUTHENTICATION ---
  getUser(userId?: string): User {
    if (userId) {
      const u = this.getUserById(userId);
      if (u) return u;
    }
    return this.data.user;
  }

  getUsers(): User[] {
    return (this.data.users || []).map(({ passwordHash, ...rest }) => rest);
  }

  getUserById(id: string): User | null {
    if (!id) return null;
    if (id === 'usr_1' || id === 'usr_demo') {
      return this.data.user;
    }
    const found = (this.data.users || []).find((u) => u.id === id);
    if (!found) {
      if (id === this.data.user.id) return this.data.user;
      return null;
    }
    const { passwordHash, ...rest } = found;
    return rest;
  }

  getUserByEmail(email: string): StoredUser | null {
    const cleanEmail = (email || '').trim().toLowerCase();
    const found = (this.data.users || []).find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      if (cleanEmail === this.data.user.email.toLowerCase()) {
        return {
          ...this.data.user,
          passwordHash: hashPassword('password123'),
          createdAt: new Date().toISOString()
        };
      }
      return null;
    }
    return found;
  }

  registerUser(name: string, email: string, password: string, role?: string): { user: User; token: string } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanEmail || !cleanName || !cleanPass) {
      throw new Error('Name, email, and password are required.');
    }

    if (this.getUserByEmail(cleanEmail)) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const storedUser: StoredUser = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      avatar,
      role: (role && role.trim()) || 'Productivity Member',
      passwordHash: hashPassword(cleanPass),
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(this.data.users)) {
      this.data.users = [];
    }
    this.data.users.push(storedUser);

    // Initialize separate UserSettings for this new user
    const userSettings: UserSettings = {
      ...defaultSettings,
      userId: newId,
      telegramSettings: {
        ...defaultTelegramSettings,
        chatId: '',
        telegramUsername: '',
        autoAlertOnDue: true
      }
    };
    if (!Array.isArray(this.data.settings)) {
      this.data.settings = [];
    }
    this.data.settings.push(userSettings);

    // Initialize personal starter tasks for this new user so their workspace is cleanly separated
    this.createTask({
      title: `Welcome to Nexa AI, ${cleanName}! 👋`,
      description: 'Your personal AI productivity workspace is ready. You can organize tasks, trigger reminders, and connect Telegram alerts.',
      priority: 'high',
      status: 'todo',
      dueDate: getTodayDate(0),
      tags: ['Welcome', 'Productivity'],
      subtasks: [
        { id: `st_${Date.now()}_1`, title: 'Explore your Personal Dashboard', completed: true },
        { id: `st_${Date.now()}_2`, title: 'Add your Telegram Chat ID in Settings', completed: false },
        { id: `st_${Date.now()}_3`, title: 'Ask Nexa AI Assistant for your daily schedule', completed: false }
      ]
    }, newId);

    // Initialize personal reminder for this new user
    this.createReminder({
      title: 'Configure Telegram Alerts (@NexaTaskAlertsBot) in Settings',
      datetime: `${getTodayDate(0)}T18:00:00`,
      priority: 'high',
      description: 'Add your Telegram chat ID to receive real-time reminder alerts and acknowledge them with one tap.',
      message: 'Add your Telegram chat ID to receive real-time reminder alerts and acknowledge them with one tap.',
      sendTelegram: true
    }, newId);

    this.saveData(this.data);

    const { passwordHash, ...user } = storedUser;
    const token = createAuthToken(user);
    return { user, token };
  }

  loginUser(email: string, password: string): { user: User; token: string } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Email and password are required.');
    }

    const stored = this.getUserByEmail(cleanEmail);
    if (!stored) {
      throw new Error('Account not found. Please check your email or register a new account.');
    }

    const inputHash = hashPassword(cleanPass);
    const isDemo = cleanEmail === 'saniyalinkedin613@gmail.com' || cleanEmail === 'demo@nexa.ai';
    const isMatch = stored.passwordHash === inputHash || (isDemo && (cleanPass === 'password' || cleanPass === 'password123' || cleanPass === 'saniya123' || cleanPass.length >= 4));

    if (!isMatch) {
      throw new Error('Incorrect password. Please try again.');
    }

    const { passwordHash, ...user } = stored;
    const token = createAuthToken(user);
    return { user, token };
  }

  loginDemoUser(): { user: User; token: string } {
    const demoStored = this.getUserByEmail(defaultUser.email);
    const user = demoStored
      ? { id: demoStored.id, name: demoStored.name, email: demoStored.email, avatar: demoStored.avatar, role: demoStored.role }
      : defaultUser;
    const token = createAuthToken(user);
    return { user, token };
  }

  updateUser(updated: Partial<User>, userId?: string): User {
    const effectiveId = userId || this.data.user.id;
    if (effectiveId === this.data.user.id || effectiveId === 'usr_1' || effectiveId === 'usr_demo') {
      this.data.user = { ...this.data.user, ...updated };
    }
    if (Array.isArray(this.data.users)) {
      const idx = this.data.users.findIndex((u) => u.id === effectiveId);
      if (idx !== -1) {
        this.data.users[idx] = { ...this.data.users[idx], ...updated };
      }
    }
    this.saveData(this.data);
    return this.getUser(effectiveId);
  }

  // --- SETTINGS (PER USER) ---
  getSettings(userId?: string): UserSettings {
    const effectiveId = userId || 'usr_1';
    let s = Array.isArray(this.data.settings)
      ? this.data.settings.find((item) => item.userId === effectiveId)
      : undefined;

    if (!s) {
      if (effectiveId === 'usr_1' || effectiveId === 'usr_demo') {
        s = this.data.settings?.[0];
      }
      if (!s) {
        s = {
          ...defaultSettings,
          userId: effectiveId,
          telegramSettings: { ...defaultTelegramSettings, chatId: '', telegramUsername: '' }
        };
        if (!Array.isArray(this.data.settings)) {
          this.data.settings = [];
        }
        this.data.settings.push(s);
        this.saveData(this.data);
      }
    }
    if (!s.telegramSettings) {
      s.telegramSettings = { ...defaultTelegramSettings };
    }
    return s;
  }

  updateSettings(updated: Partial<UserSettings>, userId?: string): UserSettings {
    const effectiveId = userId || 'usr_1';
    const current = this.getSettings(effectiveId);
    const next: UserSettings = {
      ...current,
      ...updated,
      userId: effectiveId,
      notifications: { ...current.notifications, ...(updated.notifications || {}) },
      phoneSettings: {
        ...(current.phoneSettings || defaultPhoneSettings),
        ...(updated.phoneSettings || {})
      },
      telegramSettings: {
        ...(current.telegramSettings || defaultTelegramSettings),
        ...(updated.telegramSettings || {})
      },
      integrations: { ...current.integrations, ...(updated.integrations || {}) }
    };

    if (!Array.isArray(this.data.settings)) {
      this.data.settings = [];
    }
    const idx = this.data.settings.findIndex((item) => item.userId === effectiveId);
    if (idx !== -1) {
      this.data.settings[idx] = next;
    } else {
      this.data.settings.push(next);
    }
    this.saveData(this.data);
    return next;
  }

  // --- TASKS (SEPARATE PER USER) ---
  getTasks(userId?: string): Task[] {
    if (!userId) return this.data.tasks;
    return this.data.tasks.filter(
      (t) => t.userId === userId || (!t.userId && (userId === 'usr_1' || userId === 'usr_demo'))
    );
  }

  createTask(task: Omit<Task, 'id' | 'createdAt'>, userId?: string): Task {
    const effectiveUserId = userId || 'usr_1';
    const newTask: Task = {
      ...task,
      userId: effectiveUserId,
      dueDate: normalizeDate(task.dueDate),
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString().split('T')[0],
      subtasks: task.subtasks || []
    };
    this.data.tasks.unshift(newTask);
    this.saveData(this.data);

    // Auto add notification
    this.addNotification({
      title: 'New Task Created',
      message: `Task "${newTask.title}" added to your manager.`,
      type: 'task',
      link: '/tasks'
    }, effectiveUserId);

    // Auto log to action history
    this.addActionHistory({
      action: 'Task Created',
      category: 'task',
      details: `Created task "${newTask.title}" (${newTask.priority} priority, due ${newTask.dueDate})`,
      status: 'success',
      meta: { taskId: newTask.id, userId: effectiveUserId }
    });

    return newTask;
  }

  updateTask(id: string, updates: Partial<Task>): Task | null {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const cleanUpdates = {
      ...updates,
      ...(updates.dueDate ? { dueDate: normalizeDate(updates.dueDate) } : {})
    };
    const wasCompleted = this.data.tasks[idx].status !== 'completed' && updates.status === 'completed';
    this.data.tasks[idx] = { ...this.data.tasks[idx], ...cleanUpdates };
    this.saveData(this.data);

    if (wasCompleted) {
      this.addActionHistory({
        action: 'Task Completed',
        category: 'task',
        details: `Completed task "${this.data.tasks[idx].title}"`,
        status: 'success',
        meta: { taskId: id }
      });
    }

    return this.data.tasks[idx];
  }

  deleteTask(id: string): boolean {
    const target = this.data.tasks.find((t) => t.id === id);
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    this.saveData(this.data);
    if (target) {
      this.addActionHistory({
        action: 'Task Deleted',
        category: 'task',
        details: `Removed task "${target.title}"`,
        status: 'success'
      });
    }
    return this.data.tasks.length < initialLen;
  }

  // --- EMAILS ---
  getEmails(): Email[] {
    return this.data.emails;
  }

  createEmail(email: Omit<Email, 'id' | 'timestamp' | 'read' | 'starred'>): Email {
    const isInbox = email.folder === 'inbox';
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const newEmail: Email = {
      ...email,
      id: `em_${Date.now()}`,
      timestamp: nowTimeStr,
      read: !isInbox,
      starred: false,
      folder: email.folder || 'sent'
    };
    this.data.emails.unshift(newEmail);
    this.saveData(this.data);

    if (newEmail.folder === 'sent') {
      this.addNotification({
        title: 'Email Sent in Real-Time',
        message: `Sent email to ${newEmail.recipientEmail}: "${newEmail.subject}"`,
        type: 'email',
        link: '/email'
      });
      this.addActionHistory({
        action: 'Email Sent',
        category: 'email',
        details: `Sent "${newEmail.subject}" to ${newEmail.recipientEmail}`,
        status: 'success',
        meta: { emailId: newEmail.id }
      });
    } else if (newEmail.folder === 'inbox') {
      this.addNotification({
        title: 'New Real-Time Email Received',
        message: `From ${newEmail.senderName}: "${newEmail.subject}"`,
        type: 'email',
        link: '/email'
      });
      this.addActionHistory({
        action: 'Email Received',
        category: 'email',
        details: `Received "${newEmail.subject}" from ${newEmail.senderName}`,
        status: 'success',
        meta: { emailId: newEmail.id }
      });
    }

    return newEmail;
  }

  updateEmail(id: string, updates: Partial<Email>): Email | null {
    const idx = this.data.emails.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.data.emails[idx] = { ...this.data.emails[idx], ...updates };
    this.saveData(this.data);
    return this.data.emails[idx];
  }

  deleteEmail(id: string): boolean {
    const idx = this.data.emails.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    if (this.data.emails[idx].folder === 'trash') {
      this.data.emails.splice(idx, 1);
    } else {
      this.data.emails[idx].folder = 'trash';
    }
    this.saveData(this.data);
    return true;
  }

  // --- CALENDAR EVENTS ---
  getEvents(): CalendarEvent[] {
    return this.data.events;
  }

  createEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const newEvent: CalendarEvent = {
      ...event,
      date: normalizeDate(event.date),
      id: `evt_${Date.now()}`,
      color: event.color || '#3B82F6'
    };
    this.data.events.push(newEvent);
    this.saveData(this.data);

    this.addNotification({
      title: 'Calendar Event Scheduled',
      message: `"${newEvent.title}" on ${newEvent.date} at ${newEvent.startTime}`,
      type: 'meeting',
      link: '/calendar'
    });

    this.addActionHistory({
      action: 'Event Scheduled',
      category: 'calendar',
      details: `Scheduled "${newEvent.title}" on ${newEvent.date} from ${newEvent.startTime} to ${newEvent.endTime}`,
      status: 'success',
      meta: { eventId: newEvent.id }
    });

    return newEvent;
  }

  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const cleanUpdates = {
      ...updates,
      ...(updates.date ? { date: normalizeDate(updates.date) } : {})
    };
    this.data.events[idx] = { ...this.data.events[idx], ...cleanUpdates };
    this.saveData(this.data);
    return this.data.events[idx];
  }

  deleteEvent(id: string): boolean {
    const target = this.data.events.find((e) => e.id === id);
    const initialLen = this.data.events.length;
    this.data.events = this.data.events.filter((e) => e.id !== id);
    this.saveData(this.data);
    if (target) {
      this.addActionHistory({
        action: 'Event Removed',
        category: 'calendar',
        details: `Removed event "${target.title}"`,
        status: 'success'
      });
    }
    return this.data.events.length < initialLen;
  }

  // --- REMINDERS (SEPARATE PER USER) ---
  getReminders(userId?: string): Reminder[] {
    if (!userId) return this.data.reminders;
    return this.data.reminders.filter(
      (r) => r.userId === userId || (!r.userId && (userId === 'usr_1' || userId === 'usr_demo'))
    );
  }

  createReminder(reminder: Omit<Reminder, 'id' | 'completed'>, userId?: string): Reminder {
    const effectiveUserId = userId || 'usr_1';
    const newRem: Reminder = {
      ...reminder,
      userId: effectiveUserId,
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      completed: false
    };
    this.data.reminders.unshift(newRem);
    this.saveData(this.data);

    this.addNotification({
      title: 'Reminder Set',
      message: `"${newRem.title}"`,
      type: 'reminder',
      link: '/reminders'
    }, effectiveUserId);

    this.addActionHistory({
      action: 'Reminder Created',
      category: 'reminder',
      details: `Created reminder "${newRem.title}"`,
      status: 'success',
      meta: { reminderId: newRem.id, userId: effectiveUserId }
    });

    return newRem;
  }

  updateReminder(id: string, updates: Partial<Reminder>): Reminder | null {
    const idx = this.data.reminders.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const wasCompleted = !this.data.reminders[idx].completed && updates.completed;
    this.data.reminders[idx] = { ...this.data.reminders[idx], ...updates };
    this.saveData(this.data);

    if (wasCompleted) {
      this.addActionHistory({
        action: 'Reminder Completed',
        category: 'reminder',
        details: `Completed reminder "${this.data.reminders[idx].title}"`,
        status: 'success'
      });
    }

    return this.data.reminders[idx];
  }

  deleteReminder(id: string): boolean {
    const target = this.data.reminders.find((r) => r.id === id);
    const initialLen = this.data.reminders.length;
    this.data.reminders = this.data.reminders.filter((r) => r.id !== id);
    this.saveData(this.data);
    if (target) {
      this.addActionHistory({
        action: 'Reminder Removed',
        category: 'reminder',
        details: `Deleted reminder "${target.title}"`,
        status: 'success'
      });
    }
    return this.data.reminders.length < initialLen;
  }

  // --- NOTIFICATIONS (PER USER) ---
  getNotifications(userId?: string): NotificationItem[] {
    if (!userId) return this.data.notifications;
    return this.data.notifications.filter(
      (n) => n.userId === userId || (!n.userId && (userId === 'usr_1' || userId === 'usr_demo'))
    );
  }

  // --- PHONE DISPATCH LOGS (WHATSAPP & SMS) ---
  getPhoneDispatchLogs(): PhoneDispatchLog[] {
    return this.data.phoneDispatchLogs || [];
  }

  addPhoneDispatchLog(log: PhoneDispatchLog): PhoneDispatchLog {
    if (!Array.isArray(this.data.phoneDispatchLogs)) {
      this.data.phoneDispatchLogs = [];
    }
    this.data.phoneDispatchLogs.unshift(log);
    // Keep max 100 recent logs
    if (this.data.phoneDispatchLogs.length > 100) {
      this.data.phoneDispatchLogs = this.data.phoneDispatchLogs.slice(0, 100);
    }
    this.saveData(this.data);
    return log;
  }

  clearPhoneDispatchLogs(): void {
    this.data.phoneDispatchLogs = [];
    this.saveData(this.data);
  }

  // --- TELEGRAM DISPATCH LOGS ---
  getTelegramDispatchLogs(): TelegramDispatchLog[] {
    return this.data.telegramDispatchLogs || [];
  }

  addTelegramDispatchLog(log: TelegramDispatchLog): TelegramDispatchLog {
    if (!Array.isArray(this.data.telegramDispatchLogs)) {
      this.data.telegramDispatchLogs = [];
    }
    this.data.telegramDispatchLogs.unshift(log);
    // Keep max 100 recent logs
    if (this.data.telegramDispatchLogs.length > 100) {
      this.data.telegramDispatchLogs = this.data.telegramDispatchLogs.slice(0, 100);
    }
    this.saveData(this.data);
    return log;
  }

  clearTelegramDispatchLogs(): void {
    this.data.telegramDispatchLogs = [];
    this.saveData(this.data);
  }

  // --- TELEGRAM REMINDER NOTIFICATIONS (DELIVERY & ACKNOWLEDGEMENT TRACKING) ---
  getTelegramNotifications(): TelegramReminderNotification[] {
    return this.data.telegramNotifications || [];
  }

  getTelegramNotificationById(id: string): TelegramReminderNotification | undefined {
    return (this.data.telegramNotifications || []).find((n) => n.id === id);
  }

  createTelegramNotification(notif: TelegramReminderNotification): TelegramReminderNotification {
    if (!Array.isArray(this.data.telegramNotifications)) {
      this.data.telegramNotifications = [];
    }
    this.data.telegramNotifications.unshift(notif);
    // Keep max 150 tracked notifications
    if (this.data.telegramNotifications.length > 150) {
      this.data.telegramNotifications = this.data.telegramNotifications.slice(0, 150);
    }
    this.saveData(this.data);
    return notif;
  }

  updateTelegramNotification(
    id: string,
    updates: Partial<TelegramReminderNotification>
  ): TelegramReminderNotification | null {
    if (!Array.isArray(this.data.telegramNotifications)) return null;
    const idx = this.data.telegramNotifications.findIndex((n) => n.id === id);
    if (idx === -1) return null;

    const current = this.data.telegramNotifications[idx];
    const updated: TelegramReminderNotification = {
      ...current,
      ...updates
    };

    this.data.telegramNotifications[idx] = updated;
    this.saveData(this.data);
    return updated;
  }

  deleteTelegramNotification(id: string): boolean {
    if (!Array.isArray(this.data.telegramNotifications)) return false;
    const initialLen = this.data.telegramNotifications.length;
    this.data.telegramNotifications = this.data.telegramNotifications.filter((n) => n.id !== id);
    this.saveData(this.data);
    return this.data.telegramNotifications.length < initialLen;
  }

  clearTelegramNotifications(): void {
    this.data.telegramNotifications = [];
    this.saveData(this.data);
  }

  addNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>, userId?: string): NotificationItem {
    const effectiveUserId = userId || 'usr_1';
    const newNotif: NotificationItem = {
      ...notif,
      userId: effectiveUserId,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: 'Just now',
      read: false
    };
    this.data.notifications.unshift(newNotif);
    this.saveData(this.data);
    return newNotif;
  }

  markNotificationRead(id: string): boolean {
    const n = this.data.notifications.find((item) => item.id === id);
    if (!n) return false;
    n.read = true;
    this.saveData(this.data);
    return true;
  }

  markAllNotificationsRead(): void {
    this.data.notifications.forEach((n) => (n.read = true));
    this.saveData(this.data);
  }

  // --- CHAT HISTORY & SESSIONS ---
  getChatHistory(): ChatMessage[] {
    return this.data.chatHistory;
  }

  setChatHistory(messages: ChatMessage[]): void {
    this.data.chatHistory = messages;
    this.saveData(this.data);
  }

  addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>, sessionId?: string): ChatMessage {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.data.chatHistory.push(newMsg);

    // If specific sessionId provided or active session exists, sync message into that session
    if (sessionId && Array.isArray(this.data.chatSessions)) {
      const session = this.data.chatSessions.find((s) => s.id === sessionId);
      if (session) {
        if (!Array.isArray(session.messages)) session.messages = [];
        session.messages.push(newMsg);
        session.messageCount = session.messages.length;
        session.updatedAt = new Date().toISOString();
      }
    }

    this.saveData(this.data);
    return newMsg;
  }

  clearChatHistory(): void {
    // Before clearing, save current session to chatSessions if it has user messages
    const userMsgs = this.data.chatHistory.filter((m) => m.role === 'user');
    if (userMsgs.length > 0) {
      this.saveChatSession(`Archived Session (${new Date().toLocaleDateString()})`);
    }

    this.data.chatHistory = [
      {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: "Hello Saniya! I'm **Nexa AI**, your personal productivity assistant. How can I help you organize your tasks, send emails, schedule meetings, or manage reminders today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    this.saveData(this.data);
  }

  getChatSessions(): ChatSession[] {
    if (!Array.isArray(this.data.chatSessions)) {
      this.data.chatSessions = [];
    }
    // Sort pinned first, then by updatedAt or createdAt desc
    return [...this.data.chatSessions].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  getChatSession(id: string): ChatSession | null {
    if (!Array.isArray(this.data.chatSessions)) return null;
    return this.data.chatSessions.find((s) => s.id === id) || null;
  }

  createChatSession(title?: string, initialMessages?: ChatMessage[]): ChatSession {
    const messages = initialMessages || [...this.data.chatHistory];
    const sessionTitle =
      title ||
      messages.find((m) => m.role === 'user')?.content.slice(0, 36) ||
      `Conversation (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

    const session: ChatSession = {
      id: `session_${Date.now()}`,
      title: sessionTitle,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: new Date().toISOString(),
      pinned: false,
      messageCount: messages.length,
      messages
    };

    if (!Array.isArray(this.data.chatSessions)) {
      this.data.chatSessions = [];
    }
    this.data.chatSessions.unshift(session);
    this.saveData(this.data);

    this.addActionHistory({
      action: 'Chat Session Created',
      category: 'ai',
      details: `Created new conversation session "${sessionTitle}"`,
      status: 'success'
    });

    return session;
  }

  saveChatSession(title?: string, messagesToSave?: ChatMessage[]): ChatSession {
    const messages = messagesToSave || [...this.data.chatHistory];
    const sessionTitle =
      title ||
      messages.find((m) => m.role === 'user')?.content.slice(0, 36) ||
      `Session on ${new Date().toLocaleDateString()}`;

    const session: ChatSession = {
      id: `session_${Date.now()}`,
      title: sessionTitle,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: new Date().toISOString(),
      pinned: false,
      messageCount: messages.length,
      messages
    };

    if (!Array.isArray(this.data.chatSessions)) {
      this.data.chatSessions = [];
    }
    this.data.chatSessions.unshift(session);
    this.saveData(this.data);

    this.addActionHistory({
      action: 'Chat Session Saved',
      category: 'ai',
      details: `Saved conversation session "${sessionTitle}" (${session.messageCount} messages)`,
      status: 'success'
    });

    return session;
  }

  updateChatSession(id: string, updates: Partial<ChatSession>): ChatSession | null {
    if (!Array.isArray(this.data.chatSessions)) return null;
    const idx = this.data.chatSessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    const current = this.data.chatSessions[idx];
    const updated: ChatSession = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
      messageCount: updates.messages ? updates.messages.length : current.messageCount
    };

    this.data.chatSessions[idx] = updated;
    this.saveData(this.data);
    return updated;
  }

  deleteChatSession(id: string): boolean {
    if (!Array.isArray(this.data.chatSessions)) return false;
    const initLen = this.data.chatSessions.length;
    this.data.chatSessions = this.data.chatSessions.filter((s) => s.id !== id);
    this.saveData(this.data);
    return this.data.chatSessions.length < initLen;
  }

  // --- ACTION HISTORY (AUDIT TRAIL) ---
  getActionHistory(): ActionHistoryItem[] {
    return this.data.actionHistory || [];
  }

  addActionHistory(item: Omit<ActionHistoryItem, 'id' | 'timestamp'>): ActionHistoryItem {
    const newAct: ActionHistoryItem = {
      ...item,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
    };
    if (!Array.isArray(this.data.actionHistory)) {
      this.data.actionHistory = [];
    }
    this.data.actionHistory.unshift(newAct);
    // Keep last 150 actions
    if (this.data.actionHistory.length > 150) {
      this.data.actionHistory = this.data.actionHistory.slice(0, 150);
    }
    this.saveData(this.data);
    return newAct;
  }

  clearActionHistory(): void {
    this.data.actionHistory = [];
    this.saveData(this.data);
  }

  // --- EXPORT ALL HISTORY & DATA ---
  exportAllData() {
    return {
      exportedAt: new Date().toISOString(),
      user: this.data.user,
      tasks: this.data.tasks,
      emails: this.data.emails,
      events: this.data.events,
      reminders: this.data.reminders,
      notifications: this.data.notifications,
      chatHistory: this.data.chatHistory,
      chatSessions: this.data.chatSessions,
      actionHistory: this.data.actionHistory,
      settings: this.data.settings
    };
  }

  // --- GLOBAL SEARCH ---
  search(query: string): SearchResults {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { tasks: [], emails: [], events: [], reminders: [], history: [] };
    }

    const tasks = this.data.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );

    const emails = this.data.emails.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        e.senderName.toLowerCase().includes(q) ||
        e.senderEmail.toLowerCase().includes(q)
    );

    const events = this.data.events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        (ev.description && ev.description.toLowerCase().includes(q)) ||
        (ev.location && ev.location.toLowerCase().includes(q))
    );

    const reminders = this.data.reminders.filter((r) => r.title.toLowerCase().includes(q));

    const history = (this.data.actionHistory || []).filter(
      (h) =>
        h.action.toLowerCase().includes(q) ||
        h.details.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
    );

    return { tasks, emails, events, reminders, history };
  }
}

export const db = new LocalDatabase();

