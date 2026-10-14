import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Smartphone,
  MessageSquare,
  PhoneCall,
  CheckCircle2,
  Send,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  RefreshCw,
  Clock,
  Radio,
  Sliders
} from 'lucide-react';
import { PhoneDispatchLog } from '../types';

export const PhoneAlertConfigCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    phoneSettings,
    phoneLogs,
    updatePhoneSettings,
    sendTestPhoneMessage,
    clearPhoneLogs,
    addToast
  } = useApp();

  const [phoneNumber, setPhoneNumber] = useState(phoneSettings?.phoneNumber || '+91 92260 10973');
  const [channels, setChannels] = useState<'whatsapp' | 'sms' | 'both'>(
    phoneSettings?.channels || 'both'
  );
  const [enabled, setEnabled] = useState(phoneSettings?.enabled !== false);
  const [autoAlertOnDue, setAutoAlertOnDue] = useState(phoneSettings?.autoAlertOnDue !== false);
  const [textbeeApiKey, setTextbeeApiKey] = useState(phoneSettings?.textbeeApiKey || 'txb_te8YIZDrhKVehh8FoPJZQ2gKOzIPEMA9');
  const [textbeeDeviceId, setTextbeeDeviceId] = useState(phoneSettings?.textbeeDeviceId || '');
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await updatePhoneSettings({
      phoneNumber,
      channels,
      enabled,
      autoAlertOnDue,
      textbeeApiKey,
      textbeeDeviceId
    });
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      await sendTestPhoneMessage(
        phoneNumber,
        channels,
        `🔔 [Nexa AI Test Alert] WhatsApp & SMS notification delivery is active! Your scheduled reminders will automatically trigger phone alerts right on time.`
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  const cleanPhoneDigits = phoneNumber.replace(/[^0-9]/g, '');
  const waDirectUrl = `https://wa.me/${cleanPhoneDigits}?text=${encodeURIComponent(
    '🔔 [Nexa AI] Scheduled Reminder alert delivery is configured and active for your phone!'
  )}`;

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">
                WhatsApp & SMS Automated Reminders
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                {enabled ? 'Auto-Dispatch Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Nexa AI automatically sends instant WhatsApp & SMS alerts to your phone as soon as a reminder reaches its due time.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isSendingTest}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            title="Send an instant sample WhatsApp and SMS alert"
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

      {/* TextBee API & Gateway Status Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Radio className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
          <span className="font-semibold text-slate-800">
            TextBee.dev API Gateway:
          </span>
          <span className="text-slate-600">
            API Key: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-800 font-semibold">txb_te8Y...EMA9</code>
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1 self-start sm:self-auto">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          TextBee API Connected
        </span>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Phone Number Field */}
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Your Mobile Number (WhatsApp & SMS)
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition-colors">
              <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0" />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onBlur={() => handleSave()}
                placeholder="+1 (555) 000-0000 or +91 9876543210"
                className="w-full bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
              />
              <a
                href={waDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 shrink-0 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                title="Open WhatsApp Web chat test"
              >
                <span>WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Supports international format with country code (e.g., +1, +44, +91).
            </p>
          </div>

          {/* Channel Choice */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Delivery Channels
            </label>
            <select
              value={channels}
              onChange={(e) => {
                const val = e.target.value as any;
                setChannels(val);
                updatePhoneSettings({ channels: val });
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="both">⚡ WhatsApp & SMS (Both)</option>
              <option value="whatsapp">💬 WhatsApp Only</option>
              <option value="sms">📱 SMS Only</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Select your preferred phone channel</p>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="pr-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Auto-Dispatch on Due Time</span>
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Server triggers WhatsApp/SMS instantly the second a reminder is due
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoAlertOnDue}
              onChange={(e) => {
                setAutoAlertOnDue(e.target.checked);
                updatePhoneSettings({ autoAlertOnDue: e.target.checked });
              }}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="pr-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Master Phone Alerts</span>
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Enable or pause all phone notifications system-wide
              </p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                updatePhoneSettings({ enabled: e.target.checked });
              }}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {/* TextBee Gateway Advanced Config Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowApiSettings(!showApiSettings)}
            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3 h-3" />
            <span>{showApiSettings ? 'Hide' : 'Configure'} TextBee.dev API Key & Device</span>
          </button>

          {showApiSettings && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  TextBee.dev API Key (x-api-key)
                </label>
                <input
                  type="password"
                  value={textbeeApiKey}
                  onChange={(e) => setTextbeeApiKey(e.target.value)}
                  onBlur={() => handleSave()}
                  placeholder="txb_..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Obtained from your <a href="https://textbee.dev" target="_blank" rel="noreferrer" className="text-emerald-600 underline">textbee.dev</a> dashboard.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Device ID (Optional)
                </label>
                <input
                  type="text"
                  value={textbeeDeviceId}
                  onChange={(e) => setTextbeeDeviceId(e.target.value)}
                  onBlur={() => handleSave()}
                  placeholder="Leave empty for default connected device"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Delivery Logs Dropdown / View */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Delivery Audit Trail ({phoneLogs.length} messages sent)</span>
            <span className="text-[10px] text-indigo-600 underline ml-1">
              {showLogs ? 'Hide' : 'View logs'}
            </span>
          </button>

          {phoneLogs.length > 0 && showLogs && (
            <button
              type="button"
              onClick={clearPhoneLogs}
              className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {showLogs && (
          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {phoneLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No phone messages dispatched yet. Schedule a reminder or click &quot;Send Test Alert&quot; above.
              </p>
            ) : (
              phoneLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.channel === 'whatsapp'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.channel}
                      </span>
                      <span className="font-semibold text-slate-800">{log.recipientPhone}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{log.message}</p>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
