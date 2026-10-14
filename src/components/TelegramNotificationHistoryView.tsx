import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  Bot,
  MapPin,
  Flag,
  Check,
  Zap,
  Filter,
  ArrowUpDown,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck
} from 'lucide-react';
import { TelegramNotificationStatus, TelegramReminderNotification } from '../types';

export const TelegramNotificationHistoryView: React.FC = () => {
  const {
    telegramNotifications,
    telegramSettings,
    fetchTelegramNotifications,
    acknowledgeTelegramNotification,
    clearTelegramNotifications,
    sendTestTelegramMessage,
    addToast
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TelegramNotificationStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<TelegramReminderNotification | null>(null);

  const botUsername = telegramSettings?.botUsername || 'NexaTaskAlertsBot';
  const botUrl = `https://t.me/${botUsername}`;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchTelegramNotifications();
      addToast('info', 'Refreshed', 'Telegram notification logs up to date');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickTest = async () => {
    if (!telegramSettings?.chatId) {
      addToast(
        'warning',
        'Telegram Chat ID Needed',
        `Please open @${botUsername} on Telegram, tap Start, then configure your Chat ID.`
      );
      return;
    }

    setIsSendingTest(true);
    try {
      await sendTestTelegramMessage(telegramSettings.chatId);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filter & Search Logic
  const filteredList = useMemo(() => {
    return telegramNotifications
      .filter((n) => {
        // Status filter
        if (statusFilter !== 'all' && n.status !== statusFilter) return false;

        // Priority filter
        if (priorityFilter !== 'all' && n.priority?.toLowerCase() !== priorityFilter) return false;

        // Search text
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = n.taskTitle?.toLowerCase().includes(q);
          const matchMessage = n.taskMessage?.toLowerCase().includes(q);
          const matchChat = n.chatId?.toLowerCase().includes(q);
          const matchUser = n.acknowledgedBy?.username?.toLowerCase().includes(q) || n.acknowledgedBy?.firstName?.toLowerCase().includes(q);
          const matchId = n.id?.toLowerCase().includes(q);
          if (!matchTitle && !matchMessage && !matchChat && !matchUser && !matchId) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.sentAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.sentAt || 0).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [telegramNotifications, statusFilter, priorityFilter, searchTerm, sortOrder]);

  // Aggregate Metrics
  const totalCount = telegramNotifications.length;
  const ackCount = telegramNotifications.filter((n) => n.status === 'acknowledged').length;
  const sentCount = telegramNotifications.filter((n) => n.status === 'sent').length;
  const pendingCount = telegramNotifications.filter((n) => n.status === 'pending').length;
  const failedCount = telegramNotifications.filter((n) => n.status === 'failed').length;

  const ackRate = totalCount > 0 ? Math.round((ackCount / totalCount) * 100) : 100;

  const renderStatusBadge = (status: TelegramNotificationStatus, item: TelegramReminderNotification) => {
    switch (status) {
      case 'acknowledged':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Acknowledged</span>
            {item.acknowledgedTime && (
              <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100/80 px-1 rounded">
                {item.acknowledgedTime}
              </span>
            )}
          </div>
        );
      case 'sent':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
            <Send className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0" />
            <span>Sent • Awaiting Tap</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Pending Send</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Failed</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner / Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">Telegram Notification History</h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                  @{botUsername}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500 font-mono">Asia/Kolkata (IST)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Full chronological audit trail of all Telegram task and reminder dispatches, delivery statuses, and user acknowledgements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Refresh all logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleQuickTest}
              disabled={isSendingTest}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              title="Dispatch a test alert to Telegram"
            >
              <Zap className="w-3.5 h-3.5 text-sky-200" />
              <span>{isSendingTest ? 'Sending...' : 'Send Test Alert'}</span>
            </button>

            <a
              href={botUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Open Bot</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>

            {telegramNotifications.length > 0 && (
              <button
                onClick={clearTelegramNotifications}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-1.5 transition-colors"
                title="Clear all notification records"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        {/* Verification Architecture Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900">Acknowledgement Lifecycle: </span>
            <span>
              Telegram Bot API standard message requests do not provide native read receipts. When Nexa AI sends an alert, it transitions to{' '}
              <strong className="text-sky-800">Sent</strong> upon API receipt. Explicit confirmation is verified only when the user taps{' '}
              <strong className="text-emerald-800">✅ Seen / Acknowledge</strong> in the Telegram chat, which records the exact timestamp and updates the status to{' '}
              <strong className="text-emerald-800">Acknowledged</strong>.
            </span>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Dispatched</div>
            <div className="text-xl font-bold mt-0.5">{totalCount}</div>
          </button>

          <button
            onClick={() => setStatusFilter('acknowledged')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'acknowledged'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/70'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center justify-between">
              <span>Acknowledged</span>
              <span className="text-[10px] font-bold">{ackRate}%</span>
            </div>
            <div className="text-xl font-bold mt-0.5 flex items-baseline gap-1.5">
              <span>{ackCount}</span>
              <span className="text-[11px] font-normal opacity-90">confirmed</span>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('sent')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'sent'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-sky-50/70 border-sky-200 text-sky-900 hover:bg-sky-100/70'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Sent (Awaiting Tap)</div>
            <div className="text-xl font-bold mt-0.5">{sentCount}</div>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/70'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pending Send</div>
            <div className="text-xl font-bold mt-0.5">{pendingCount}</div>
          </button>

          <button
            onClick={() => setStatusFilter('failed')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'failed'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-100/70'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Failed</div>
            <div className="text-xl font-bold mt-0.5">{failedCount}</div>
          </button>
        </div>

        {/* Filter, Search, and Sort Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by task title, message, user, or Chat ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Segmented Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-slate-500 px-2">Priority:</span>
              {(['all', 'high', 'medium', 'low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                    priorityFilter === p ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Sort order toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Historical List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span>Historical Notifications</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-mono">
              {filteredList.length} of {totalCount}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Auto-synced via background listener</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="p-3 bg-slate-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-slate-400">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No matching Telegram notifications found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {totalCount === 0
                ? 'No Telegram reminder notifications have been recorded yet. Click "Send Test Alert" or create a reminder due in a few minutes.'
                : 'Try adjusting your search query or status filter above.'}
            </p>
            {totalCount === 0 && (
              <button
                onClick={handleQuickTest}
                disabled={isSendingTest}
                className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors shadow-2xs"
              >
                <Zap className="w-4 h-4 text-sky-200" />
                <span>Send First Test Notification</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredList.map((notif) => {
              const isExpanded = expandedId === notif.id;
              const isAck = notif.status === 'acknowledged';
              const isHigh = notif.priority === 'HIGH';

              return (
                <div key={notif.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                  {/* Row Top Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 tracking-tight">
                          {notif.taskTitle}
                        </span>
                        {renderStatusBadge(notif.status, notif)}
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            isHigh ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {notif.priority}
                        </span>
                        {notif.telegramMessageId && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Telegram Msg #{notif.telegramMessageId}
                          </span>
                        )}
                      </div>

                      {/* Task Message / Description */}
                      {notif.taskMessage ? (
                        <p className="text-xs text-slate-700 line-clamp-2">
                          📝 {notif.taskMessage}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          (No specific task message provided)
                        </p>
                      )}

                      {/* Locations (Start / End) */}
                      {(notif.startingPoint || notif.endingPoint) && (
                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap pt-0.5">
                          {notif.startingPoint && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Starting Point: <strong>{notif.startingPoint}</strong></span>
                            </span>
                          )}
                          {notif.endingPoint && (
                            <span className="flex items-center gap-1">
                              <Flag className="w-3.5 h-3.5 text-rose-500" />
                              <span>Ending Point: <strong>{notif.endingPoint}</strong></span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp Grid & Quick Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Scheduled</span>
                          <span className="font-semibold text-slate-800">{notif.scheduledTime}</span>
                        </div>
                        <span className="text-slate-300">/</span>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Triggered</span>
                          <span className="font-semibold text-slate-800">{notif.triggeredTime}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {notif.status === 'sent' && (
                          <button
                            onClick={() => acknowledgeTelegramNotification(notif.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                            title="Confirm acknowledgement from dashboard"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Acknowledged</span>
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : notif.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Payload & Delivery Audit Trail */}
                  {isExpanded && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                          <span className="text-slate-400 font-bold block uppercase text-[10px]">Notification ID</span>
                          <span className="font-mono text-slate-700 select-all">{notif.id}</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                          <span className="text-slate-400 font-bold block uppercase text-[10px]">Recipient Chat ID</span>
                          <span className="font-mono text-slate-700">{notif.chatId || 'Not Configured'}</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                          <span className="text-slate-400 font-bold block uppercase text-[10px]">Telegram API Sent At</span>
                          <span className="font-mono text-slate-700">
                            {notif.sentTimestamp || (notif.sentAt ? new Date(notif.sentAt).toLocaleTimeString() : 'Not Dispatched')}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                          <span className="text-slate-400 font-bold block uppercase text-[10px]">Acknowledgement Time</span>
                          <span className="font-mono text-emerald-700 font-semibold">
                            {notif.acknowledgedTime || (notif.acknowledgedAt ? new Date(notif.acknowledgedAt).toLocaleTimeString() : 'Awaiting Tap')}
                          </span>
                        </div>
                      </div>

                      {notif.acknowledgedBy && (
                        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>
                              Confirmed by: <strong>{notif.acknowledgedBy.firstName || 'Telegram User'}</strong>
                              {notif.acknowledgedBy.username ? ` (@${notif.acknowledgedBy.username})` : ''}
                              {notif.acknowledgedBy.userId ? ` • User ID: ${notif.acknowledgedBy.userId}` : ''}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-mono">
                            {notif.acknowledgedAt ? new Date(notif.acknowledgedAt).toISOString() : ''}
                          </span>
                        </div>
                      )}

                      {notif.errorMessage && (
                        <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 text-xs">
                          <strong>Error Details: </strong> {notif.errorMessage}
                        </div>
                      )}

                      {/* Message Preview */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Telegram Alert Text Rendered:
                        </span>
                        <pre className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
{`🔔 NEXA AI TASK & REMINDER ALERT 🚨

📌 Title: ${notif.taskTitle}${notif.taskMessage ? `\n📝 Task Message: ${notif.taskMessage}` : ''}${notif.startingPoint ? `\n📍 Starting Point: ${notif.startingPoint}` : ''}${notif.endingPoint ? `\n🏁 Ending Point: ${notif.endingPoint}` : ''}
⏰ Scheduled: ${notif.scheduledTime}
⚡ Priority: ${notif.priority}
🕒 Triggered At: ${notif.triggeredTime}${notif.status === 'acknowledged' ? `\n\n✅ Acknowledged: ${notif.acknowledgedTime || 'Confirmed'}\n👤 Confirmed by: ${notif.acknowledgedBy?.firstName || 'User'}` : ''}

✨ Sent automatically by your Nexa AI Personal Productivity Assistant.
🤖 Bot: @${botUsername}`}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
