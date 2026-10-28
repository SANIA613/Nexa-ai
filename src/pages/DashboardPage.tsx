import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  Calendar,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Bot
} from 'lucide-react';
import { TelegramDeliveryTrackerCard } from '../components/TelegramDeliveryTrackerCard';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const { tasks, emails, events, completeTask, setIsComposeEmailOpen } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  const todaysTasks = tasks.filter((t) => t.dueDate === todayStr || t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const upcomingMeetings = events.filter((e) => e.date === todayStr);
  const unreadEmails = emails.filter((e) => e.folder === 'inbox' && !e.read);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const focusScore = 92;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {getGreeting()}, {user?.name || 'there'} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your day.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsComposeEmailOpen(true)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-2xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Compose Email</span>
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => setActiveTab('tasks')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Today's Tasks
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">{todaysTasks.length}</div>
            <div className="text-emerald-600 text-xs font-medium">
              {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 80}% done
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('email')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Unread Emails
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">{unreadEmails.length}</div>
            <div className="text-amber-500 text-xs font-medium">Action needed</div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('calendar')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Upcoming Meetings
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">{upcomingMeetings.length}</div>
            <div className="text-indigo-600 text-xs font-medium">
              {upcomingMeetings[0] ? `Next at ${upcomingMeetings[0].startTime}` : 'Next at 4:00 PM'}
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('analytics')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Focus Score
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">{focusScore}%</div>
            <div className="text-blue-600 text-xs font-medium">Top 5% today</div>
          </div>
        </div>
      </div>

      {/* Telegram Reminder Delivery & User-Acknowledgement Tracker */}
      <TelegramDeliveryTrackerCard />

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Schedule & Tasks Overview */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Schedule Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Today's Schedule</h3>
              </div>
              <button
                onClick={() => setActiveTab('calendar')}
                className="text-indigo-600 text-xs font-semibold hover:underline flex items-center gap-1"
              >
                <span>Full Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {upcomingMeetings.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No meetings scheduled for today</p>
              ) : (
                upcomingMeetings.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-mono text-xs font-bold shrink-0">
                        {evt.startTime}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">{evt.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {evt.location || 'Google Meet'} • {evt.attendees?.length || 1} attendees
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shadow-2xs">
                      Confirmed
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick AI Assistant Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-slate-700 text-sm">Nexa Intelligence Agent</span>
              </div>
              <button
                onClick={() => setActiveTab('assistant')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Open Full Agent &rarr;
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 text-xs">
                  AI
                </div>
                <div className="bg-slate-100 p-3.5 rounded-2xl rounded-tl-none text-sm text-slate-800 max-w-[85%]">
                  Hello {user?.name || 'there'}! I've analyzed your schedule. You have a free slot this afternoon. Should I help you plan your next task?
                </div>
              </div>

              <div className="flex items-start space-x-3 justify-end">
                <div className="bg-indigo-600 text-white p-3.5 rounded-2xl rounded-tr-none text-sm max-w-[85%] shadow-sm shadow-indigo-200">
                  Yes, please schedule it and send a progress email to Professor Rahul.
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setActiveTab('assistant');
                    }
                  }}
                  placeholder="Ask Nexa to schedule, send email, or create reminders..."
                  className="w-full border border-slate-200 rounded-xl py-3 px-4 pr-24 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => setActiveTab('assistant')}
                  className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-2xs"
                >
                  <Bot className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Urgent Tasks & Smart Insights */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          {/* Urgent Tasks Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base">Urgent Tasks</h3>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-indigo-600 text-xs font-semibold hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {todaysTasks.slice(0, 4).map((t) => {
                const isHigh = t.priority === 'high';
                return (
                  <div
                    key={t.id}
                    className={`flex items-center p-3 rounded-xl border transition-colors ${
                      isHigh
                        ? 'bg-red-50/80 border-red-100'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <button
                      onClick={() => completeTask(t.id)}
                      className={`w-5 h-5 border-2 rounded flex-shrink-0 cursor-pointer mr-3 flex items-center justify-center transition-colors ${
                        t.status === 'completed'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : isHigh
                          ? 'border-red-400 hover:border-red-500'
                          : 'border-slate-300 hover:border-indigo-500'
                      }`}
                    >
                      {t.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-semibold truncate ${
                          t.status === 'completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {t.title}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          isHigh ? 'text-red-600' : 'text-slate-500'
                        }`}
                      >
                        {isHigh ? 'High Priority' : 'Mid Priority'} • Due {t.dueDate}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smart Insights Card */}
          <div className="bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 p-5 text-white shrink-0">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-200" />
              <h3 className="font-semibold text-base">Smart Insights</h3>
            </div>
            <p className="text-xs text-indigo-100 leading-relaxed mb-4">
              You're most productive on Wednesdays. You have a meeting with Prof. Rahul today, and I've prepared all the relevant files for your review.
            </p>
            <button
              onClick={() => setActiveTab('analytics')}
              className="w-full py-2 bg-indigo-500/50 hover:bg-indigo-400/50 rounded-lg text-xs font-bold transition-colors border border-indigo-400/30 text-white"
            >
              View Daily Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
