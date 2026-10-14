import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Bot,
  MapPin,
  Flag,
  Trash2,
  Sparkles,
  Info,
  Check,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { TelegramNotificationStatus, TelegramReminderNotification } from '../types';

export const TelegramDeliveryTrackerCard: React.FC = () => {
  const {
    telegramNotifications,
    telegramSettings,
    fetchTelegramNotifications,
    acknowledgeTelegramNotification,
    clearTelegramNotifications,
    sendTestTelegramMessage,
    addToast
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'acknowledged' | 'failed'>('all');
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  const botUsername = telegramSettings?.botUsername || 'NexaTaskAlertsBot';
  const botUrl = `https://t.me/${botUsername}`;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchTelegramNotifications();
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickTestAlert = async () => {
    if (!telegramSettings?.chatId) {
      addToast(
        'warning',
        'Telegram Chat ID Needed',
        `Please open @${botUsername} on Telegram, press Start, then configure your Chat ID in Settings.`
      );
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await sendTestTelegramMessage(telegramSettings.chatId);
      if (res.success) {
        setLastRefreshed('Just now');
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const totalCount = telegramNotifications.length;
  const acknowledgedCount = telegramNotifications.filter((n) => n.status === 'acknowledged').length;
  const sentCount = telegramNotifications.filter((n) => n.status === 'sent').length;
  const failedCount = telegramNotifications.filter((n) => n.status === 'failed').length;
  const pendingCount = telegramNotifications.filter((n) => n.status === 'pending').length;

  const ackPercentage = totalCount > 0 ? Math.round((acknowledgedCount / totalCount) * 100) : 100;

  const filteredNotifications = telegramNotifications.filter((n) => {
    if (filter === 'all') return true;
    return n.status === filter;
  });

  const getStatusBadge = (status: TelegramNotificationStatus, item: TelegramReminderNotification) => {
    switch (status) {
      case 'acknowledged':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acknowledged</span>
            {item.acknowledgedTime && (
              <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100/70 px-1 rounded">
                {item.acknowledgedTime}
              </span>
            )}
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Send className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
            <span>Sent • Awaiting Tap</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Send</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      {/* Header with Title and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                Telegram Reminder Delivery & User-Acknowledgement Tracker
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                @{botUsername}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit log tracking alert dispatch and explicit user confirmations via the Telegram "✅ Seen / Acknowledge" inline button.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refresh status now"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
            <span className="text-[10px] text-slate-400 hidden md:inline">({lastRefreshed})</span>
          </button>

          <button
            type="button"
            onClick={handleQuickTestAlert}
            disabled={isSendingTest}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
            title="Send test alert to verify inline button"
          >
            <Zap className="w-3.5 h-3.5 text-sky-200" />
            <span>{isSendingTest ? 'Sending...' : 'Test Telegram Alert'}</span>
          </button>

          <a
            href={botUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <span>Open @{botUsername}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>
      </div>

      {/* Verification Notice: Explaining Sent vs Delivered / Acknowledged */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-950">Acknowledgement Protocol: </span>
          The standard Telegram Bot API does not provide read receipts for regular bot messages.
          Status <span className="font-semibold text-sky-800 bg-sky-100 px-1 py-0.5 rounded">Sent</span> indicates Telegram API accepted the message request.
          True confirmation is recorded only when the user taps the interactive <span className="font-semibold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded">✅ Seen / Acknowledge</span> button in Telegram.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilter('all')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 uppercase tracking-wider">Total Alerts</div>
          <div className="text-xl font-bold mt-0.5">{totalCount}</div>
        </div>

        <div
          onClick={() => setFilter('acknowledged')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filter === 'acknowledged'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-emerald-50/60 border-emerald-200 text-emerald-900 hover:bg-emerald-100/60'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 uppercase tracking-wider flex items-center justify-between">
            <span>Acknowledged</span>
            <span className="text-[10px] font-bold">{ackPercentage}%</span>
          </div>
          <div className="text-xl font-bold mt-0.5 flex items-baseline gap-2">
            <span>{acknowledgedCount}</span>
            <span className="text-xs font-normal opacity-90">confirmed</span>
          </div>
        </div>

        <div
          onClick={() => setFilter('sent')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filter === 'sent'
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-sky-50/60 border-sky-200 text-sky-900 hover:bg-sky-100/60'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 uppercase tracking-wider">Sent (Awaiting Tap)</div>
          <div className="text-xl font-bold mt-0.5">{sentCount}</div>
        </div>

        <div
          onClick={() => setFilter('failed')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filter === 'failed'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-rose-50/60 border-rose-200 text-rose-900 hover:bg-rose-100/60'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 uppercase tracking-wider">Failed Deliveries</div>
          <div className="text-xl font-bold mt-0.5">{failedCount}</div>
        </div>
      </div>

      {/* Notifications Audit List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Reminder Alerts ({filteredNotifications.length})
            </h4>
            {filter !== 'all' && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                Filter: {filter}
              </span>
            )}
          </div>

          {telegramNotifications.length > 0 && (
            <button
              type="button"
              onClick={clearTelegramNotifications}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <Clock className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">No Telegram reminder notifications tracked yet.</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              When a scheduled reminder triggers, or when you click "Test Telegram Alert" above, its delivery and user acknowledgement will be recorded here live.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {filteredNotifications.map((item) => {
              const isAcknowledged = item.status === 'acknowledged';
              const isHigh = item.priority === 'HIGH';

              return (
                <div
                  key={item.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs hover:bg-slate-50/70 p-2.5 rounded-xl transition-colors"
                >
                  {/* Left: Task Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{item.taskTitle}</span>
                      {getStatusBadge(item.status, item)}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isHigh ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.priority}
                      </span>
                      {item.telegramMessageId && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Msg #{item.telegramMessageId}
                        </span>
                      )}
                    </div>

                    {/* Task Message / Description */}
                    {item.taskMessage && (
                      <p className="text-slate-600 text-xs line-clamp-2">
                        📝 {item.taskMessage}
                      </p>
                    )}

                    {/* Locations (Starting & Ending points if provided) */}
                    {(item.startingPoint || item.endingPoint) && (
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                        {item.startingPoint && (
                          <span className="flex items-center gap-1 text-slate-700">
                            <MapPin className="w-3 h-3 text-indigo-500" />
                            <span>From: <strong>{item.startingPoint}</strong></span>
                          </span>
                        )}
                        {item.endingPoint && (
                          <span className="flex items-center gap-1 text-slate-700">
                            <Flag className="w-3 h-3 text-rose-500" />
                            <span>To: <strong>{item.endingPoint}</strong></span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Error message if failed */}
                    {item.errorMessage && (
                      <p className="text-[11px] text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                        Error: {item.errorMessage}
                      </p>
                    )}
                  </div>

                  {/* Right: Timestamps & Confirmation Status */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-1 text-[11px] text-slate-500 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Scheduled:</span>
                      <span className="font-mono font-semibold text-slate-700">{item.scheduledTime}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400">Triggered:</span>
                      <span className="font-mono font-semibold text-slate-700">{item.triggeredTime}</span>
                    </div>

                    {item.sentTimestamp && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Send className="w-3 h-3 text-sky-500" />
                        <span>API Sent: {item.sentTimestamp}</span>
                      </div>
                    )}

                    {isAcknowledged && item.acknowledgedTime ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Acknowledged at {item.acknowledgedTime}</span>
                        {item.acknowledgedBy?.firstName && (
                          <span className="text-emerald-800 font-normal">
                            by {item.acknowledgedBy.firstName}
                            {item.acknowledgedBy.username ? ` (@${item.acknowledgedBy.username})` : ''}
                          </span>
                        )}
                      </div>
                    ) : item.status === 'sent' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-amber-600 text-[10px] font-medium animate-pulse">
                          Awaiting tap on Telegram...
                        </span>
                        <button
                          type="button"
                          onClick={() => acknowledgeTelegramNotification(item.id)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold transition-colors"
                          title="Simulate / Confirm acknowledgement from dashboard"
                        >
                          Confirm in Dashboard
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
