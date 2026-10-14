import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Menu, Search, Sun, Moon, Bot, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setIsOpenMobile: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, setIsOpenMobile }) => {
  const { user, theme, toggleTheme } = useAuth();
  const { setIsSearchOpen } = useApp();

  // Keyboard shortcut Ctrl+K / Cmd+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Productivity Dashboard';
      case 'assistant':
        return 'Nexa AI Assistant';
      case 'email':
        return 'Email Manager';
      case 'tasks':
        return 'Task Manager';
      case 'calendar':
        return 'Calendar Scheduler';
      case 'reminders':
        return 'Reminders';
      case 'analytics':
        return 'Productivity Analytics';
      case 'settings':
        return 'Settings & Integrations';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 sm:px-8 flex items-center justify-between gap-4 shrink-0">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpenMobile(true)}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {getTabTitle(activeTab)}
            {activeTab === 'assistant' && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-500" /> Tool Calling Active
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Global Search Bar Trigger */}
        <div
          onClick={() => setIsSearchOpen(true)}
          className="relative w-48 sm:w-80 cursor-pointer group"
        >
          <input
            type="text"
            readOnly
            placeholder="Search emails, tasks, or AI commands..."
            className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-16 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 group-hover:text-indigo-500 transition-colors" />
          <div className="absolute right-3 top-2 flex items-center gap-1.5">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white text-slate-400 rounded border border-slate-200 shadow-2xs font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Quick Assistant Launcher / New Action Button */}
        {activeTab !== 'assistant' ? (
          <button
            onClick={() => setActiveTab('assistant')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI Assistant</span>
          </button>
        ) : (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            New Action
          </button>
        )}

        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
        </button>

        {/* Notifications Dropdown */}
        <NotificationDropdown setActiveTab={setActiveTab} />
      </div>
    </header>
  );
};
