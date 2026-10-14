import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Check, CheckCheck, Calendar, CheckSquare, Mail, AlertCircle, Bot } from 'lucide-react';

interface NotificationDropdownProps {
  setActiveTab: (tab: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ setActiveTab }) => {
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-purple-400" />;
      case 'ai':
        return <Bot className="w-4 h-4 text-indigo-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
    }
  };

  const handleNotificationClick = (id: string, link?: string) => {
    markNotificationRead(id);
    if (link) {
      const tabName = link.replace('/', '');
      setActiveTab(tabName || 'dashboard');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-100 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center">
            {unreadNotificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-100">Notifications</h3>
                {unreadNotificationCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                    {unreadNotificationCount} new
                  </span>
                )}
              </div>

              <button
                onClick={markAllNotificationsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n.id, n.link)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      n.read ? 'bg-slate-900/50 hover:bg-slate-800/40' : 'bg-slate-800/30 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/50 shrink-0">
                      {getIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs font-semibold truncate ${n.read ? 'text-slate-300' : 'text-slate-100'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 shrink-0">{n.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>

                    {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
