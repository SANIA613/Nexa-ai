import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Sparkles, TrendingUp, CheckCircle2, Clock, Award, Target } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { analyticsData, tasks } = useApp();

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 85;

  const weeklyPerformance = analyticsData?.weeklyPerformance || [
    { day: 'Mon', completed: 4, pending: 2 },
    { day: 'Tue', completed: 6, pending: 1 },
    { day: 'Wed', completed: 8, pending: 3 },
    { day: 'Thu', completed: 5, pending: 2 },
    { day: 'Fri', completed: 9, pending: 0 },
    { day: 'Sat', completed: 3, pending: 1 },
    { day: 'Sun', completed: 2, pending: 0 }
  ];

  const categoryDistribution = analyticsData?.categoryDistribution || [
    { category: 'AI Dev', count: 8 },
    { category: 'Academic', count: 5 },
    { category: 'Client', count: 4 },
    { category: 'Study', count: 6 },
    { category: 'Career', count: 3 }
  ];

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6'];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Productivity Analytics</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Track task completion rates, weekly performance trends, and AI focus score
        </p>
      </div>

      {/* Hero Stats Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Weekly Completion Rate</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
          <span className="text-[10px] text-emerald-600 font-bold">+5% vs last week</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Focus Time Hours</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">28.5 hrs</p>
          <span className="text-[10px] text-indigo-600 font-bold">Optimal focus score</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
          <span className="text-[10px] text-purple-600 font-bold">High efficiency</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>AI Productivity Score</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">92 / 100</p>
          <span className="text-[10px] text-amber-600 font-bold">Top 5% efficiency</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Productivity Area Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Weekly Task Performance
            </h3>
            <span className="text-xs text-indigo-600 font-semibold">Completed vs Pending</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyPerformance}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="completed" stroke="#4f46e5" fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Category Distribution</h3>
            <span className="text-xs text-purple-600 font-semibold">Tasks per tag</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryDistribution}>
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI AI Productivity Insights */}
      <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900">AI Weekly Executive Insights</h3>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          • Your highest productivity burst occurs on <strong className="text-indigo-700">Wednesdays between 10:00 AM and 1:00 PM</strong>.
          <br />
          • You completed <strong className="text-emerald-700">82% of all assigned high-priority tasks</strong> ahead of scheduled deadlines.
          <br />• Recommendation: Keep meeting durations under 30 minutes to preserve continuous focus blocks.
        </p>
      </div>
    </div>
  );
};
