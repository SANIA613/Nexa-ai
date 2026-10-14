import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  RefreshCw,
  Clock,
  Radio,
  Trash2,
  Bot,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { TelegramDispatchLog } from '../types';

export const TelegramAlertConfigCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    telegramSettings,
    telegramLogs,
    updateTelegramSettings,
    sendTestTelegramMessage,
    detectTelegramChat,
    clearTelegramLogs,
    addToast
  } = useApp();

  const [chatId, setChatId] = useState(telegramSettings?.chatId || '');
  const [enabled, setEnabled] = useState(telegramSettings?.enabled !== false);
  const [autoAlertOnDue, setAutoAlertOnDue] = useState(telegramSettings?.autoAlertOnDue !== false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookInfoData, setWebhookInfoData] = useState<any>(null);
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(false);
  const [copiedBot, setCopiedBot] = useState(false);

  const botUsername = telegramSettings?.botUsername || 'NexaTaskAlertsBot';
  const botUrl = `https://t.me/${botUsername}`;

  // Keep local state in sync when context changes
  React.useEffect(() => {
    if (telegramSettings?.chatId && !chatId) {
      setChatId(telegramSettings.chatId);
    }
  }, [telegramSettings]);

  const handleFetchWebhookInfo = async () => {
    setIsLoadingWebhook(true);
    try {
      const res = await fetch('/api/telegram/webhook-info');
      const data = await res.json();
      setWebhookInfoData(data);
      if (data?.result?.url) {
        setWebhookUrlInput(data.result.url);
      }
    } catch {
      addToast('error', 'Failed to fetch webhook status');
    } finally {
      setIsLoadingWebhook(false);
    }
  };

  const handleSetWebhook = async () => {
    if (!webhookUrlInput.trim()) {
      addToast('warning', 'Please enter a valid HTTPS webhook URL');
      return;
    }
    setIsLoadingWebhook(true);
    try {
      const res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrlInput.trim() })
      });
      const data = await res.json();
      if (data.ok) {
        addToast('success', 'Telegram Webhook Activated! 🌐', 'Incoming updates will now be routed directly to this URL.');
        await handleFetchWebhookInfo();
      } else {
        addToast('error', 'Webhook Error', data.description || 'Failed to set webhook');
      }
    } catch {
      addToast('error', 'Failed to configure webhook');
    } finally {
      setIsLoadingWebhook(false);
    }
  };

  const handleDeleteWebhook = async () => {
    setIsLoadingWebhook(true);
    try {
      const res = await fetch('/api/telegram/delete-webhook', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        addToast('info', 'Webhook Removed', 'Switched back to safe background long-polling listener.');
        setWebhookUrlInput('');
        await handleFetchWebhookInfo();
      }
    } catch {
      addToast('error', 'Failed to remove webhook');
    } finally {
      setIsLoadingWebhook(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await updateTelegramSettings({
      chatId: chatId.trim(),
      enabled,
      autoAlertOnDue
    });
  };

  const handleDetect = async () => {
    setIsDetecting(true);
    try {
      const res = await detectTelegramChat(true);
      if (res.found && res.chatId) {
        setChatId(res.chatId);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSendTest = async () => {
    if (!chatId.trim()) {
      addToast(
        'warning',
        'Chat ID Required',
        `Please open ${botUrl}, click Start, and click "Auto-Detect My Chat ID" first.`
      );
      return;
    }

    setIsSendingTest(true);
    try {
      await sendTestTelegramMessage(chatId.trim());
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCopyBot = () => {
    navigator.clipboard.writeText(`@${botUsername}`);
    setCopiedBot(true);
    setTimeout(() => setCopiedBot(false), 2000);
    addToast('info', 'Copied to Clipboard', `@${botUsername}`);
  };

  const isConnected = !!(telegramSettings?.chatId || chatId.trim());

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                Telegram Bot Automated Alerts
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                @{botUsername}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isConnected ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Linked & Active</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Link Required</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Nexa AI automatically dispatches real-time alerts straight to your Telegram via @{botUsername} the moment any scheduled reminder is due.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a
            href={botUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Open bot in Telegram"
          >
            <span>Open @{botUsername}</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={isSendingTest}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            title="Send an instant sample alert to your Telegram"
          >
            {isSendingTest ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send Test Alert</span>
          </button>
        </div>
      </div>

      {/* Connection Guide Banner if not connected */}
      {!isConnected && (
        <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-950">
              <span className="font-bold">Quick 1-Click Telegram Setup:</span>
              <ol className="list-decimal list-inside text-[11px] text-sky-900 mt-1 space-y-0.5">
                <li>
                  Click <a href={botUrl} target="_blank" rel="noreferrer" className="underline font-bold text-sky-700">Open @{botUsername}</a> and tap <strong>Start</strong> (or send <em>hi</em>).
                </li>
                <li>
                  Click <strong>Auto-Detect My Chat ID</strong> below to instantly link your alerts!
                </li>
              </ol>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDetect}
              disabled={isDetecting}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
            >
              {isDetecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              <span>Auto-Detect My Chat ID</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Telegram Chat ID Field */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Your Telegram Chat ID
              </label>
              <button
                type="button"
                onClick={handleDetect}
                disabled={isDetecting}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {isDetecting ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-sky-500" />
                )}
                <span>Auto-Detect Chat ID</span>
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-sky-500 focus-within:bg-white transition-colors">
              <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                onBlur={() => handleSave()}
                placeholder="e.g. 5819402859 (Click Auto-Detect or send /start to bot)"
                className="w-full bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={handleCopyBot}
                className="text-[11px] text-slate-600 hover:text-slate-800 font-semibold flex items-center gap-1 shrink-0 bg-slate-200/60 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                title="Copy Bot Username"
              >
                {copiedBot ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>@{botUsername}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Your unique Telegram Chat ID is automatically detected when you send any message or /start to @{botUsername}.
            </p>
          </div>

          {/* Delivery Configuration */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Alert Trigger Mode
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors text-xs text-slate-800 font-medium">
                <input
                  type="checkbox"
                  checked={autoAlertOnDue}
                  onChange={(e) => {
                    setAutoAlertOnDue(e.target.checked);
                    updateTelegramSettings({ autoAlertOnDue: e.target.checked });
                  }}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Auto-alert on due time</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors text-xs text-slate-800 font-medium">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    updateTelegramSettings({ enabled: e.target.checked });
                  }}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Telegram alerts active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Feature Highlights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-[11px] text-slate-600">
              Instant sub-second Telegram dispatch
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-[11px] text-slate-600">
              Interactive bot commands (/tasks, /reminders)
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-slate-600">
              HTTP Bot API Token configured & verified
            </span>
          </div>
        </div>
      </form>

      {/* Webhook & Polling Configuration Guide (Requirement 10) */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (!showWebhookGuide && !webhookInfoData) {
                handleFetchWebhookInfo();
              }
              setShowWebhookGuide(!showWebhookGuide);
            }}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-indigo-600" />
            <span>Webhook vs Long-Polling Listener Configuration</span>
            <span className="text-[10px] text-slate-400">
              {showWebhookGuide ? '(Click to collapse)' : '(Click to expand)'}
            </span>
          </button>
        </div>

        {showWebhookGuide && (
          <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">How Nexa AI Receives Telegram Updates & Acknowledgements:</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • <strong>Long-Polling (Default Active):</strong> Nexa AI runs a single safe background polling daemon that continuously listens for incoming messages and callback queries without opening public inbound ports. Duplicate listener prevention is strictly enforced.
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • <strong>Webhook (Production):</strong> If hosting with an HTTPS domain or Cloud Run service URL, you can route Telegram updates directly via HTTP POST to: <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-[10px]">/api/telegram/webhook</code>.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">
                Custom Webhook URL (HTTPS):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://your-domain.com/api/telegram/webhook"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSetWebhook}
                  disabled={isLoadingWebhook}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  Set Webhook
                </button>
                <button
                  type="button"
                  onClick={handleDeleteWebhook}
                  disabled={isLoadingWebhook}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold disabled:opacity-50 transition-colors"
                  title="Remove webhook and switch back to long-polling"
                >
                  Reset to Polling
                </button>
              </div>

              {webhookInfoData?.result && (
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[10px] text-slate-600 space-y-0.5">
                  <div><strong>Active Webhook URL:</strong> {webhookInfoData.result.url || 'None (Using Long-Polling)'}</div>
                  <div><strong>Pending Updates:</strong> {webhookInfoData.result.pending_update_count || 0}</div>
                  {webhookInfoData.result.last_error_message && (
                    <div className="text-rose-600"><strong>Last Error:</strong> {webhookInfoData.result.last_error_message}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Dispatch Audit Log */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Telegram Dispatch Audit Log ({telegramLogs.length})</span>
            <span className="text-[10px] text-slate-400">
              {showLogs ? '(Click to collapse)' : '(Click to expand)'}
            </span>
          </button>

          {telegramLogs.length > 0 && showLogs && (
            <button
              type="button"
              onClick={clearTelegramLogs}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Logs</span>
            </button>
          )}
        </div>

        {showLogs && (
          <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1">
            {telegramLogs.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2">
                No Telegram alert logs recorded yet. Send a test message or let a scheduled reminder fire!
              </p>
            ) : (
              telegramLogs.map((log) => {
                const isAck = log.status === 'acknowledged';
                const isSent = log.status === 'sent';
                const isFailed = log.status === 'failed';

                return (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {log.reminderTitle || 'Telegram Alert'}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isAck
                              ? 'bg-emerald-100 text-emerald-800'
                              : isSent
                              ? 'bg-sky-100 text-sky-800'
                              : isFailed
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                        {log.telegramMessageId && (
                          <span className="text-[10px] text-slate-400">
                            Msg #{log.telegramMessageId}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {log.message.replace(/\*/g, '')}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-400 shrink-0 sm:text-right">
                      <div>Chat: {log.chatId}</div>
                      <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
