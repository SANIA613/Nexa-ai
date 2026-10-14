import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../lib/useSpeech';
import { VoiceMicButton } from '../components/VoiceMicButton';
import { TelegramAlertConfigCard } from '../components/TelegramAlertConfigCard';
import { TelegramNotificationHistoryView } from '../components/TelegramNotificationHistoryView';
import { parseReminderDatetime, format12HourIST, formatScheduledDisplayIST } from '../lib/notifications';
import {
  BellRing,
  Plus,
  Trash2,
  Clock,
  Check,
  Volume2,
  VolumeX,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Play,
  Calendar,
  Sparkles,
  Smartphone,
  Send,
  ExternalLink,
  MessageSquare,
  Bot
} from 'lucide-react';

export const RemindersPage: React.FC = () => {
  const {
    reminders,
    createReminder,
    updateReminder,
    deleteReminder,
    dueReminders,
    notificationPermission,
    requestBrowserNotificationPermission,
    testBrowserNotification,
    soundAlertsEnabled,
    setSoundAlertsEnabled,
    quickCreateTestReminder,
    phoneSettings,
    dispatchReminderNow,
    telegramNotifications
  } = useApp();

  const [activeRemindersTab, setActiveRemindersTab] = useState<'manager' | 'history'>('manager');
  const [title, setTitle] = useState('');
  const [datetime, setDatetime] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [taskMessage, setTaskMessage] = useState('');
  const [startingPoint, setStartingPoint] = useState('');
  const [endingPoint, setEndingPoint] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { isListening, audioLevel, toggleListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setTitle(transcript);
    }
  });

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const cleanMsg = taskMessage.trim() || undefined;
    const cleanStart = startingPoint.trim() || undefined;
    const cleanEnd = endingPoint.trim() || undefined;

    await createReminder({
      title: title.trim(),
      datetime: datetime || 'Today at 5:00 PM',
      priority,
      message: cleanMsg,
      description: cleanMsg,
      startingPoint: cleanStart,
      startLocation: cleanStart,
      endingPoint: cleanEnd,
      endLocation: cleanEnd,
      completed: false
    });

    setTitle('');
    setDatetime('');
    setTaskMessage('');
    setStartingPoint('');
    setEndingPoint('');
    setShowAdvanced(false);
  };

  const handleSnooze = async (id: string, mins: number) => {
    const r = reminders.find((rem) => rem.id === id);
    if (!r) return;
    const now = Date.now();
    const futureEpoch = now + mins * 60 * 1000;
    const timeStr = format12HourIST(futureEpoch);

    await updateReminder(id, {
      snoozedUntil: `Snoozed +${mins}m (until ${timeStr})`,
      snoozedUntilEpoch: futureEpoch,
      datetime: timeStr
    });
  };

  // Helper to format due status
  const getReminderDueStatus = (datetimeStr: string, completed: boolean) => {
    if (completed) return { text: 'Completed', color: 'text-slate-400 bg-slate-100', isDue: false };
    const date = parseReminderDatetime(datetimeStr);
    if (!date) return { text: datetimeStr, color: 'text-slate-600 bg-slate-100', isDue: false };

    const diff = date.getTime() - Date.now();
    if (diff <= 0) {
      const overdueMins = Math.floor(Math.abs(diff) / (60 * 1000));
      return {
        text: overdueMins > 0 ? `DUE NOW (Overdue by ${overdueMins}m)` : 'DUE RIGHT NOW',
        color: 'text-rose-700 bg-rose-100 border border-rose-300 font-bold animate-pulse',
        isDue: true
      };
    } else if (diff < 60 * 60 * 1000) {
      const mins = Math.max(1, Math.round(diff / (60 * 1000)));
      return { text: `Due in ${mins} min${mins > 1 ? 's' : ''}`, color: 'text-amber-700 bg-amber-50 border border-amber-200 font-semibold', isDue: false };
    } else {
      return { text: datetimeStr, color: 'text-slate-600 bg-slate-100', isDue: false };
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Smart Reminders & Alerts</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time browser notifications, audio chimes, voice dictation, and smart snooze scheduling
          </p>
        </div>

        {/* Quick Test Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => quickCreateTestReminder(5)}
            className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            title="Create a reminder due in 5 seconds to test automatic Telegram bot alert (@NexaTaskAlertsBot) and desktop browser notification"
          >
            <Zap className="w-4 h-4 text-sky-600 animate-bounce" />
            <span>⚡ Test 5s Telegram Alert</span>
          </button>
          <button
            onClick={() => quickCreateTestReminder(10)}
            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            title="Create a reminder due in 10 seconds to test automatic Telegram bot alert (@NexaTaskAlertsBot) and desktop browser notification"
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>⚡ Test 10s Telegram Alert</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation View Switcher: Scheduled Reminders vs Telegram Notification History */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveRemindersTab('manager')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeRemindersTab === 'manager'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>Scheduled Reminders</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-mono font-bold">
            {reminders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRemindersTab('history')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeRemindersTab === 'history'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-sky-600" />
          <span>Telegram Alert History</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-mono font-bold">
            {telegramNotifications.length}
          </span>
          {telegramNotifications.some((n) => n.status === 'sent') && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Awaiting user confirmation" />
          )}
        </button>
      </div>

      {activeRemindersTab === 'history' ? (
        <TelegramNotificationHistoryView />
      ) : (
        <>
          {/* Telegram Automated Dispatcher Card */}
          <TelegramAlertConfigCard />

      {/* Browser Notification Banner & Status Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${
              notificationPermission === 'granted'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : notificationPermission === 'denied'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-indigo-50 border-indigo-200 text-indigo-600'
            }`}
          >
            <BellRing className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">Desktop Browser Notifications</h3>
              {notificationPermission === 'granted' ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Active & Enabled
                </span>
              ) : notificationPermission === 'denied' ? (
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Blocked in Browser
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Permission Required
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {notificationPermission === 'granted'
                ? 'Nexa AI will alert your desktop screen with rich native alerts whenever a scheduled reminder is due.'
                : notificationPermission === 'denied'
                ? 'Browser notifications are blocked. Please click the icon in your address bar to allow notifications for this site.'
                : 'Enable browser notifications so you receive popup alerts even when you are browsing other tabs.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Sound alert toggle */}
          <button
            onClick={() => setSoundAlertsEnabled(!soundAlertsEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              soundAlertsEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
            title="Toggle audible chime when a reminder is due"
          >
            {soundAlertsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Sound: {soundAlertsEnabled ? 'On' : 'Muted'}</span>
          </button>

          {/* Test button */}
          <button
            onClick={testBrowserNotification}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Trigger an instant test notification & sound alert"
          >
            <Play className="w-3.5 h-3.5 text-indigo-600" />
            <span>Test Notification</span>
          </button>

          {/* Enable button if not granted */}
          {notificationPermission !== 'granted' && (
            <button
              onClick={requestBrowserNotificationPermission}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Enable Alerts</span>
            </button>
          )}
        </div>
      </div>

      {/* Due / Overdue Reminders Active Callout Box */}
      {dueReminders.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50/80 border-2 border-rose-300 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                ⏰ Reminders Due Right Now ({dueReminders.length})
              </h3>
            </div>
            <span className="text-[11px] text-rose-700 font-medium">Action Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dueReminders.map((rem) => (
              <div
                key={`due_${rem.id}`}
                className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{rem.title}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 shrink-0">
                      DUE NOW
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-500" /> {rem.datetime}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => updateReminder(rem.id, { completed: true })}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSnooze(rem.id, 5)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200"
                    >
                      +5m
                    </button>
                    <button
                      onClick={() => handleSnooze(rem.id, 15)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200"
                    >
                      +15m
                    </button>
                    <button
                      onClick={() => handleSnooze(rem.id, 60)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200"
                    >
                      +1h
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Form with Voice Mic & Preset Quick-Set Buttons */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" /> Create Scheduled Reminder
        </h3>

        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Title with Voice Dictation */}
            <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 w-full focus-within:border-indigo-500 focus-within:bg-white transition-colors">
              <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
              <input
                type="text"
                required
                placeholder={
                  isListening ? 'Listening... Speak reminder topic...' : 'e.g. Call client regarding project proposal...'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <VoiceMicButton
                isListening={isListening}
                onToggle={toggleListening}
                audioLevel={audioLevel}
                size="sm"
                tooltip="Speak reminder title"
              />
            </div>

            {/* Scheduled Datetime Field */}
            <div className="w-full sm:w-60 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white transition-colors">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <input
                type="text"
                placeholder="e.g. Today at 5:00 PM"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Priority Selection */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none w-full sm:w-auto"
            >
              <option value="high">🚨 High Priority</option>
              <option value="medium">⏰ Medium Priority</option>
              <option value="low">📌 Low Priority</option>
            </select>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-sm shadow-indigo-200 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 pb-1 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
              <span className="text-slate-400 font-medium shrink-0">Quick presets:</span>
              <button
                type="button"
                onClick={() => setDatetime(format12HourIST(Date.now() + 15 * 60 * 1000))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 transition-colors shrink-0"
              >
                +15 mins
              </button>
              <button
                type="button"
                onClick={() => setDatetime(format12HourIST(Date.now() + 60 * 60 * 1000))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 transition-colors shrink-0"
              >
                +1 hour
              </button>
              <button
                type="button"
                onClick={() => setDatetime('05:00 PM')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 transition-colors shrink-0"
              >
                Today 05:00 PM
              </button>
              <button
                type="button"
                onClick={() => setDatetime('08:00 PM')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 transition-colors shrink-0"
              >
                Tonight 08:00 PM
              </button>
              <button
                type="button"
                onClick={() => setDatetime('Tomorrow at 09:00 AM')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 transition-colors shrink-0"
              >
                Tomorrow 09:00 AM
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {showAdvanced ? 'Hide Message & Locations' : '+ Add Task Message & Locations'}
            </button>
          </div>

          {/* Optional Task Message & Locations Expansion */}
          {showAdvanced && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 animate-in fade-in">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  📝 Task Message / Description (Sent in Telegram Alert)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discuss the project update with the client."
                  value={taskMessage}
                  onChange={(e) => setTaskMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    📍 Starting Point (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Office"
                    value={startingPoint}
                    onChange={(e) => setStartingPoint(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    🏁 Ending Point (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Client Location"
                    value={endingPoint}
                    onChange={(e) => setEndingPoint(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Reminders List */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
            All Reminders ({reminders.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            {reminders.filter((r) => !r.completed).length} Pending • {reminders.filter((r) => r.completed).length} Completed
          </span>
        </div>

        <div className="space-y-3">
          {reminders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <BellRing className="w-8 h-8 text-slate-300 stroke-1" />
              <span>No scheduled reminders yet. Add one above or tell Nexa AI via voice / chat.</span>
            </div>
          ) : (
            reminders.map((rem) => {
              const status = getReminderDueStatus(rem.datetime, rem.completed);

              return (
                <div
                  key={rem.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    rem.completed
                      ? 'bg-slate-50/70 border-slate-200 opacity-60'
                      : status.isDue
                      ? 'bg-rose-50/40 border-rose-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => updateReminder(rem.id, { completed: !rem.completed })}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        rem.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-indigo-600 bg-white'
                      }`}
                      title={rem.completed ? 'Mark pending' : 'Mark completed'}
                    >
                      {rem.completed && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`text-xs font-bold ${
                            rem.completed ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {rem.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${status.color}`}>
                          {status.text}
                        </span>
                        {rem.priority === 'high' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            High
                          </span>
                        )}
                        {rem.telegramDispatched || rem.phoneDispatched ? (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1"
                            title={`Dispatched to Telegram (@NexaTaskAlertsBot)`}
                          >
                            <Bot className="w-3 h-3 text-sky-600" />
                            <span>✈️ Telegram Alert Sent</span>
                          </span>
                        ) : (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1"
                            title="Telegram alert will be dispatched on due time via @NexaTaskAlertsBot"
                          >
                            <Bot className="w-3 h-3 text-sky-600" />
                            <span>Telegram Alert Scheduled</span>
                          </span>
                        )}
                      </div>

                      {rem.message && (
                        <p className="text-[11px] text-slate-700 mt-1 flex items-center gap-1 font-medium">
                          <span>📝</span> <span>{rem.message}</span>
                        </p>
                      )}
                      {(rem.startingPoint || rem.endingPoint) && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-1 flex-wrap">
                          {rem.startingPoint && (
                            <span className="flex items-center gap-1">
                              <span>📍</span> <span>From: {rem.startingPoint}</span>
                            </span>
                          )}
                          {rem.endingPoint && (
                            <span className="flex items-center gap-1">
                              <span>🏁</span> <span>To: {rem.endingPoint}</span>
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>Scheduled: {formatScheduledDisplayIST(rem.datetime)}</span>
                        {rem.snoozedUntil && (
                          <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {rem.snoozedUntil}
                          </span>
                        )}
                        {rem.relatedType && (
                          <span className="text-[10px] text-slate-400 capitalize">
                            Linked {rem.relatedType}
                          </span>
                        )}
                        {rem.dispatchedAt && (
                          <span className="text-[10px] text-slate-400">
                            (Dispatched {format12HourIST(rem.dispatchedAt)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {/* Instant Telegram dispatch trigger */}
                    {!rem.completed && (
                      <button
                        onClick={() => dispatchReminderNow(rem.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-semibold border border-sky-200 flex items-center gap-1 transition-colors shadow-2xs"
                        title="Send Telegram alert for this reminder right now via @NexaTaskAlertsBot"
                      >
                        <Send className="w-3 h-3 text-sky-600" />
                        <span>Alert Telegram Now</span>
                      </button>
                    )}

                    {!rem.completed && (
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => handleSnooze(rem.id, 5)}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors"
                          title="Snooze 5 minutes"
                        >
                          +5m
                        </button>
                        <button
                          onClick={() => handleSnooze(rem.id, 15)}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors"
                          title="Snooze 15 minutes"
                        >
                          +15m
                        </button>
                        <button
                          onClick={() => handleSnooze(rem.id, 60)}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors"
                          title="Snooze 1 hour"
                        >
                          +1h
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => deleteReminder(rem.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  )}
</div>
);
};
