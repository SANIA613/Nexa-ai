import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarEvent } from '../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  Clock,
  MapPin,
  Users,
  X,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MINI_DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function normalizeDateStr(d?: string): string {
  if (!d) return new Date().toISOString().split('T')[0];
  const trimmed = d.trim().split('T')[0];
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return trimmed;
}

export const CalendarPage: React.FC = () => {
  const { events, createEvent, updateEvent, deleteEvent, suggestFreeSlots } = useApp();

  const [viewMode, setViewMode] = useState<'year' | 'month' | 'week' | 'day'>('month');

  // Date state
  const todayStr = normalizeDateStr(new Date().toISOString().split('T')[0]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDateStr);
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:00');
  const [location, setLocation] = useState('Google Meet');
  const [attendeesInput, setAttendeesInput] = useState('rahul.verma@techcorp.com');
  const [description, setDescription] = useState('');

  // AI Suggestions
  const [freeSlots, setFreeSlots] = useState<{ slot: string; confidence: string }[] | null>(null);
  const [isFindingSlots, setIsFindingSlots] = useState(false);

  // Helper functions for date math
  const formatDateStr = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const getEventsForDate = (dateStr: string) => {
    const targetNorm = normalizeDateStr(dateStr);
    return events.filter((e) => normalizeDateStr(e.date) === targetNorm);
  };

  const jumpToDate = (targetDate: string, targetView?: 'year' | 'month' | 'week' | 'day') => {
    const norm = normalizeDateStr(targetDate);
    const parsed = new Date(norm + 'T00:00:00');
    if (!isNaN(parsed.getTime())) {
      setCurrentYear(parsed.getFullYear());
      setCurrentMonth(parsed.getMonth());
      setSelectedDateStr(norm);
      if (targetView) {
        setViewMode(targetView);
      }
    }
  };

  const handleOpenCreate = (prefillDate?: string, prefillTime?: string) => {
    const targetDate = prefillDate ? normalizeDateStr(prefillDate) : selectedDateStr;
    setTitle('');
    setDate(targetDate);
    setStartTime(prefillTime || '15:00');
    setEndTime('16:00');
    setLocation('Google Meet');
    setAttendeesInput('rahul.verma@techcorp.com');
    setDescription('');
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setTitle(evt.title);
    setDate(normalizeDateStr(evt.date));
    setStartTime(evt.startTime);
    setEndTime(evt.endTime);
    setLocation(evt.location || '');
    setAttendeesInput(evt.attendees ? evt.attendees.join(', ') : '');
    setDescription(evt.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const normalizedTargetDate = normalizeDateStr(date);
    const attendees = attendeesInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (editingEvent) {
      await updateEvent(editingEvent.id, {
        title,
        date: normalizedTargetDate,
        startTime,
        endTime,
        location,
        attendees,
        description
      });
    } else {
      await createEvent({
        title,
        date: normalizedTargetDate,
        startTime,
        endTime,
        location,
        attendees,
        description
      });
    }

    // Automatically synchronize calendar viewport to newly scheduled date
    jumpToDate(normalizedTargetDate);
    setIsModalOpen(false);
  };

  const handleFindFreeTime = async () => {
    setIsFindingSlots(true);
    try {
      const slots = await suggestFreeSlots();
      setFreeSlots(slots);
    } finally {
      setIsFindingSlots(false);
    }
  };

  // Year Navigation
  const handlePrevYear = () => setCurrentYear((y) => y - 1);
  const handleNextYear = () => setCurrentYear((y) => y + 1);

  // Month Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Week Navigation
  const handlePrevWeek = () => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    jumpToDate(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    jumpToDate(d.toISOString().split('T')[0]);
  };

  // Day Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    jumpToDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    jumpToDate(d.toISOString().split('T')[0]);
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Get week dates around selected date (Sunday to Saturday)
  const getWeekDates = () => {
    const curr = new Date(selectedDateStr + 'T00:00:00');
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr);
      d.setDate(curr.getDate() - dayOfWeek + i);
      week.push(d.toISOString().split('T')[0]);
    }
    return week;
  };

  // Render Mini Month for Year View
  const renderMiniMonth = (monthIdx: number) => {
    const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
    const startDayOfWeek = new Date(currentYear, monthIdx, 1).getDay();

    const blanks = Array.from({ length: startDayOfWeek });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div
        key={monthIdx}
        className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs space-y-2"
      >
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <button
            onClick={() => {
              setCurrentMonth(monthIdx);
              setViewMode('month');
            }}
            className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors"
          >
            {MONTH_NAMES[monthIdx]}
          </button>
          <span className="text-[10px] text-slate-400 font-medium">{currentYear}</span>
        </div>

        {/* Day Header */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {MINI_DAY_NAMES.map((d, i) => (
            <span key={i} className="text-[10px] font-bold text-slate-400">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {blanks.map((_, i) => (
            <span key={`blank-${i}`} className="h-6" />
          ))}

          {days.map((day) => {
            const dateStr = formatDateStr(currentYear, monthIdx, day);
            const dayEvents = getEventsForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDateStr;

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDateStr(dateStr);
                  setCurrentMonth(monthIdx);
                }}
                onDoubleClick={() => handleOpenCreate(dateStr)}
                className={`h-6 w-full rounded-md text-[11px] font-medium flex flex-col items-center justify-center relative transition-all ${
                  isToday
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : isSelected
                    ? 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title={`${dateStr}: ${dayEvents.length} events scheduled`}
              >
                <span>{day}</span>
                {dayEvents.length > 0 && (
                  <span
                    className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                      isToday ? 'bg-amber-300' : 'bg-indigo-600'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            Calendar Scheduler
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic date synchronization, annual/monthly/weekly timelines, and persistent storage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleFindFreeTime}
            disabled={isFindingSlots}
            className="px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            {isFindingSlots ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-600" />
            )}
            <span>AI Free Slots</span>
          </button>

          {/* View Switcher */}
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1">
            {(['month', 'week', 'day', 'year'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  viewMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleOpenCreate()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-2 shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* AI Free Time Suggestions Drawer */}
      {freeSlots && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              AI Found Available Free Slots:
            </h3>
            <button onClick={() => setFreeSlots(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {freeSlots.map((s, idx) => (
              <div
                key={idx}
                onClick={() => {
                  handleOpenCreate(selectedDateStr, '14:00');
                  setFreeSlots(null);
                }}
                className="p-3 rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 cursor-pointer transition-all space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{s.slot}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    {s.confidence}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Click to schedule meeting in this slot</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Navigation Header Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {viewMode === 'year' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevYear}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Previous Year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 px-2">{currentYear} Full Year</h2>
              <button
                onClick={handleNextYear}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Next Year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {viewMode === 'month' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 px-2">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 px-2">
                Week of {getWeekDates()[0]} to {getWeekDates()[6]}
              </h2>
              <button
                onClick={handleNextWeek}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 px-2">
                {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <button
                onClick={handleNextDay}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Date Jumper */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Go to:</span>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => {
                if (e.target.value) {
                  jumpToDate(e.target.value);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none"
            />
          </div>

          <button
            onClick={handleJumpToToday}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Today
          </button>
          {selectedDateStr && (
            <button
              onClick={() => handleOpenCreate(selectedDateStr)}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event on {selectedDateStr}</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODES */}

      {/* 1. MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center pb-2 border-b border-slate-100">
            {DAY_NAMES.map((d, i) => (
              <span key={i} className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
              const blanks = Array.from({ length: startDayOfWeek });
              const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

              return (
                <>
                  {blanks.map((_, i) => (
                    <div key={`month-blank-${i}`} className="min-h-28 p-2 bg-slate-50/50 rounded-xl border border-slate-100" />
                  ))}

                  {days.map((d) => {
                    const dateStr = formatDateStr(currentYear, currentMonth, d);
                    const dayEvts = getEventsForDate(dateStr);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDateStr;

                    return (
                      <div
                        key={d}
                        onClick={() => setSelectedDateStr(dateStr)}
                        onDoubleClick={() => handleOpenCreate(dateStr)}
                        className={`min-h-28 p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isToday
                            ? 'bg-indigo-50/50 border-indigo-400 ring-1 ring-indigo-200'
                            : isSelected
                            ? 'bg-slate-50 border-indigo-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                              isToday ? 'bg-indigo-600 text-white' : 'text-slate-800'
                            }`}
                          >
                            {d}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCreate(dateStr);
                            }}
                            className="text-slate-300 hover:text-indigo-600 p-0.5 rounded transition-colors"
                            title={`Add event on ${dateStr}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Events list for this day */}
                        <div className="space-y-1 my-1 overflow-y-auto max-h-20">
                          {dayEvts.map((evt) => (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(evt);
                              }}
                              className="px-1.5 py-1 rounded-md bg-indigo-100/80 hover:bg-indigo-200 text-indigo-950 text-[10px] font-semibold truncate border border-indigo-200/60 flex items-center gap-1 shadow-2xs"
                              title={`${evt.startTime} - ${evt.endTime}: ${evt.title}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                              <span className="truncate">{evt.startTime} {evt.title}</span>
                            </div>
                          ))}
                        </div>

                        {dayEvts.length === 0 && (
                          <span className="text-[10px] text-slate-300 italic self-center">No events</span>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2. WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-7 gap-3 text-center pb-2 border-b border-slate-100">
            {getWeekDates().map((wDate, idx) => {
              const parsed = new Date(wDate + 'T00:00:00');
              const isToday = wDate === todayStr;
              const isSelected = wDate === selectedDateStr;
              return (
                <div
                  key={wDate}
                  onClick={() => setSelectedDateStr(wDate)}
                  className={`p-2 rounded-xl cursor-pointer transition-all ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isSelected
                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider">{DAY_NAMES[idx]}</div>
                  <div className="text-base font-extrabold mt-0.5">{parsed.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* 7 Columns for the 7 Days of the Week */}
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 min-h-[360px]">
            {getWeekDates().map((wDate) => {
              const dayEvts = getEventsForDate(wDate);
              const isToday = wDate === todayStr;
              return (
                <div
                  key={wDate}
                  className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                    isToday ? 'bg-indigo-50/40 border-indigo-300' : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
                    <span className="text-xs font-bold text-slate-700">{wDate}</span>
                    <button
                      onClick={() => handleOpenCreate(wDate)}
                      className="text-slate-400 hover:text-indigo-600 p-0.5"
                      title="Add event"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayEvts.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-6">No events</p>
                    ) : (
                      dayEvts.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => handleOpenEdit(evt)}
                          className="p-2 rounded-lg bg-white border border-indigo-200 hover:border-indigo-400 cursor-pointer shadow-2xs space-y-1 transition-all"
                        >
                          <div className="text-[11px] font-bold text-indigo-950 truncate">{evt.title}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            <span>{evt.startTime} - {evt.endTime}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAY VIEW */}
      {viewMode === 'day' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Timeline Schedule for {selectedDateStr}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {getEventsForDate(selectedDateStr).length} events scheduled for this day
              </p>
            </div>

            <button
              onClick={() => handleOpenCreate(selectedDateStr)}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event on this Day</span>
            </button>
          </div>

          <div className="space-y-2">
            {getEventsForDate(selectedDateStr).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No events scheduled for {selectedDateStr}. Click "Add Event on this Day" to create one.
              </div>
            ) : (
              getEventsForDate(selectedDateStr).map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 hover:border-indigo-300 transition-all shadow-2xs"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{evt.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {evt.startTime} - {evt.endTime} • {evt.location || 'Google Meet'}
                      </p>
                      {evt.description && (
                        <p className="text-xs text-slate-600 mt-1">{evt.description}</p>
                      )}
                      {evt.attendees && evt.attendees.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          <Users className="w-3 h-3 text-purple-600" />
                          <span>Attendees: {evt.attendees.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(evt)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors"
                      title="Edit event"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteEvent(evt.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. ALL YEAR VIEW (12 Mini-Month Grid) */}
      {viewMode === 'year' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => renderMiniMonth(i))}
          </div>
        </div>
      )}

      {/* Scheduled Events Section (Always visible bottom panel) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-base text-slate-900">All Scheduled Meetings & Events</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {events.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-400">Click "Jump to Date" on any event to view it on the calendar</p>
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400">
              No calendar events found. Create one above to get started.
            </div>
          ) : (
            events.map((evt) => {
              const normDate = normalizeDateStr(evt.date);
              const isSelected = normDate === selectedDateStr;
              return (
                <div
                  key={evt.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 group ${
                    isSelected
                      ? 'bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {evt.title}
                      </h3>
                      {evt.description && <p className="text-xs text-slate-500 mt-1">{evt.description}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => jumpToDate(evt.date, 'month')}
                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title="Jump to date in calendar"
                      >
                        <span>Jump to Date</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(evt)}
                        className="text-slate-400 hover:text-slate-700 p-1"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteEvent(evt.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-medium">
                        {normDate} ({evt.startTime} - {evt.endTime})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span className="truncate">{evt.location || 'Google Meet'}</span>
                    </div>
                  </div>

                  {evt.attendees && evt.attendees.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>Attendees: {evt.attendees.join(', ')}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create / Edit Calendar Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                {editingEvent ? 'Edit Calendar Event' : 'Schedule New Event'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client Meeting / Demo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Location / Meeting Link</label>
                <input
                  type="text"
                  placeholder="Google Meet / Zoom / Office"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Attendees (comma-separated emails)</label>
                <input
                  type="text"
                  placeholder="rahul.verma@techcorp.com, client@enterprise.com"
                  value={attendeesInput}
                  onChange={(e) => setAttendeesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Description / Agenda</label>
                <textarea
                  rows={2}
                  placeholder="Meeting agenda & notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                >
                  {editingEvent ? 'Save Changes' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
