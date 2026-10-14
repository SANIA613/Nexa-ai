import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { TelegramAlertConfigCard } from '../components/TelegramAlertConfigCard';
import {
  Settings,
  User,
  Bot,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Calendar,
  CheckSquare,
  Save,
  BellRing,
  Volume2,
  VolumeX,
  Play,
  AlertTriangle,
  Smartphone
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const {
    addToast,
    gmailAuth,
    connectGmail,
    disconnectGmail,
    notificationPermission,
    requestBrowserNotificationPermission,
    testBrowserNotification,
    soundAlertsEnabled,
    setSoundAlertsEnabled
  } = useApp();

  const [name, setName] = useState(user?.name || 'Saniya');
  const [email, setEmail] = useState(user?.email || 'saniyalinkedin613@gmail.com');
  const [role, setRole] = useState(user?.role || 'Productivity Lead');
  const [avatar, setAvatar] = useState(
    user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
  );

  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [responseTone, setResponseTone] = useState('professional');
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, email, role, avatar });
    addToast('success', 'Profile Saved', 'Your settings and user profile have been updated successfully.');
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Integrations</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your profile details, connected accounts, and AI assistant behavior
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Nav Sections / Summary */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={avatar}
                alt={name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/20"
              />
              <div>
                <h3 className="font-bold text-sm text-slate-900">{name}</h3>
                <p className="text-xs text-indigo-600 font-semibold">{role}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">{email}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Tier</h4>
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-900">Nexa AI Pro</span>
                <p className="text-[10px] text-indigo-700">Unlimited tool calling & sync</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Edit Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* User Profile Settings */}
          <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" /> User Profile
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Role / Job Title</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>

          {/* Integrations Panel */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">Connected Workspace Apps</h3>

            <div className="space-y-3">
              {/* Real Gmail OAuth Item */}
              <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Gmail (OAuth 2.0 API)</span>
                      {gmailAuth.isConnected && (
                        <span className="text-[10px] text-emerald-600 font-normal">
                          ({gmailAuth.userEmail})
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Dispatches live emails to actual recipient inboxes in real time and synchronizes message history
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {gmailAuth.isConnected ? (
                    <>
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected
                      </span>
                      <button
                        onClick={disconnectGmail}
                        className="text-[11px] text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={connectGmail}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Connect Gmail</span>
                    </button>
                  )}
                </div>
              </div>

              {[
                { name: 'Google Calendar', icon: Calendar, status: 'Connected', desc: 'Reads events and books meeting slots' },
                { name: 'Google Tasks', icon: CheckSquare, status: 'Connected', desc: 'Syncs to-do items and subtasks' }
              ].map((app, idx) => {
                const Icon = app.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{app.name}</h4>
                        <p className="text-[10px] text-slate-500">{app.desc}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Settings */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" /> AI Engine Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">AI Model Alias</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Response Style</label>
                <select
                  value={responseTone}
                  onChange={(e) => setResponseTone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                >
                  <option value="professional">Professional & Concise</option>
                  <option value="friendly">Friendly & Detailed</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-900">Conversation Memory</span>
                <p className="text-[10px] text-slate-500">Remember context across assistant chat turns</p>
              </div>
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(e) => setMemoryEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Telegram Automated Bot Alerts */}
          <TelegramAlertConfigCard />

          {/* Desktop & Browser Notifications Settings */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-indigo-600" /> Desktop Notifications & Reminder Alerts
              </h3>
              {notificationPermission === 'granted' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Active
                </span>
              ) : notificationPermission === 'denied' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Blocked
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                  Action Required
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Receive instant desktop notifications and synthesized multi-tone audio alerts whenever your scheduled reminders, tasks, and calendar events are due.
            </p>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">System Notification Permissions</h4>
                  <p className="text-[10px] text-slate-500">
                    Status: <span className="font-semibold text-slate-700 uppercase">{notificationPermission}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={requestBrowserNotificationPermission}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Enable Permissions</span>
                    </button>
                  )}
                  <button
                    onClick={testBrowserNotification}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Test Notification</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    {soundAlertsEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Harmonic Audio Chime</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">Plays an audible chime through Web Audio API when reminders fire</p>
                </div>

                <input
                  type="checkbox"
                  checked={soundAlertsEnabled}
                  onChange={(e) => setSoundAlertsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
