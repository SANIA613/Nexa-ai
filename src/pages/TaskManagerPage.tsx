import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../lib/useSpeech';
import { VoiceMicButton } from '../components/VoiceMicButton';
import { Task, Priority, TaskStatus } from '../types';
import {
  List,
  Kanban,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Tag,
  Loader2,
  ListTodo
} from 'lucide-react';

export const TaskManagerPage: React.FC = () => {
  const { tasks, createTask, updateTask, deleteTask, completeTask, breakdownTask } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('kanban');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('high');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [tagsInput, setTagsInput] = useState('AI, Project');

  const [loadingBreakdownId, setLoadingBreakdownId] = useState<string | null>(null);

  // Voice Speech Recognition for Search
  const {
    isListening: isListeningSearch,
    audioLevel: searchAudioLevel,
    toggleListening: toggleListeningSearch
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setSearchQuery(transcript);
    }
  });

  // Voice Speech Recognition for Task Title Modal
  const {
    isListening: isListeningTitle,
    audioLevel: titleAudioLevel,
    toggleListening: toggleListeningTitle
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setTitle(transcript);
    }
  });

  // Voice Speech Recognition for Task Description Modal
  const {
    isListening: isListeningDesc,
    audioLevel: descAudioLevel,
    toggleListening: toggleListeningDesc
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  });

  const filteredTasks = tasks.filter((t) => {
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q));

    return matchesPriority && matchesQuery;
  });

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setPriority('high');
    setStatus('todo');
    setDueDate(new Date().toISOString().split('T')[0]);
    setTagsInput('AI, Project');
    setEditingTask(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (t: Task) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setPriority(t.priority);
    setStatus(t.status);
    setDueDate(t.dueDate);
    setTagsInput(t.tags.join(', '));
    setIsCreateOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (editingTask) {
      await updateTask(editingTask.id, {
        title,
        description,
        priority,
        status,
        dueDate,
        tags
      });
    } else {
      await createTask({
        title,
        description,
        priority,
        status,
        dueDate,
        tags
      });
    }
    setIsCreateOpen(false);
  };

  const handleBreakdown = async (t: Task) => {
    setLoadingBreakdownId(t.id);
    try {
      await breakdownTask(t.id);
    } finally {
      setLoadingBreakdownId(null);
    }
  };

  const handleToggleSubtask = async (task: Task, subtaskId: string) => {
    const updatedSubtasks = (task.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await updateTask(task.id, { subtasks: updatedSubtasks });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Task Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize, prioritize, voice-dictate, and auto-breakdown tasks using AI assistance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle Pills */}
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-2 shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with Voice Mic */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={isListeningSearch ? 'Listening... Speak task search...' : 'Search tasks or tags...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <VoiceMicButton
            isListening={isListeningSearch}
            onToggle={toggleListeningSearch}
            audioLevel={searchAudioLevel}
            size="sm"
            tooltip="Search tasks by voice"
          />
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium mr-1">Priority:</span>
          {['all', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                filterPriority === p
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'todo', title: 'To Do', color: 'bg-slate-400' },
            { id: 'in_progress', title: 'In Progress', color: 'bg-indigo-600' },
            { id: 'completed', title: 'Completed', color: 'bg-emerald-600' }
          ].map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.color}`} />
                    {col.title} ({colTasks.length})
                  </h3>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">No tasks in {col.title}</div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm space-y-3 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              t.priority === 'high'
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : t.priority === 'medium'
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : 'bg-blue-50 text-blue-600 border border-blue-200'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        {t.description && <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>}

                        {/* Subtasks List */}
                        {t.subtasks && t.subtasks.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                            <span className="text-[10px] font-semibold text-indigo-700 block">
                              Subtasks ({t.subtasks.filter((st) => st.completed).length}/{t.subtasks.length}):
                            </span>
                            {t.subtasks.map((st) => (
                              <label
                                key={st.id}
                                className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={st.completed}
                                  onChange={() => handleToggleSubtask(t, st.id)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                                />
                                <span className={st.completed ? 'line-through text-slate-400' : ''}>{st.title}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* AI Breakdown Button */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleBreakdown(t)}
                            disabled={loadingBreakdownId === t.id}
                            className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                          >
                            {loadingBreakdownId === t.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            <span>AI Auto-Breakdown</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteTask(t.id)} className="text-slate-400 hover:text-rose-600 p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No matching tasks found</div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => completeTask(t.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                      t.status === 'completed'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-indigo-600 bg-white'
                    }`}
                  >
                    {t.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {t.title}
                    </h4>
                    {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>Due: {t.dueDate}</span>
                      <span>• Tags: {t.tags.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleBreakdown(t)}
                    disabled={loadingBreakdownId === t.id}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    {loadingBreakdownId === t.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                    )}
                    <span>Breakdown</span>
                  </button>
                  <button onClick={() => handleOpenEdit(t)} className="text-slate-400 hover:text-slate-700 p-1.5">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteTask(t.id)} className="text-slate-400 hover:text-rose-600 p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create / Edit Task Modal with Voice Mic */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-indigo-600" />
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Task Title</label>
                  <VoiceMicButton
                    isListening={isListeningTitle}
                    onToggle={toggleListeningTitle}
                    audioLevel={titleAudioLevel}
                    size="sm"
                    tooltip="Speak task title"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder={isListeningTitle ? 'Listening... Speak task title...' : 'e.g. Build an AI chatbot'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Description</label>
                  <VoiceMicButton
                    isListening={isListeningDesc}
                    onToggle={toggleListeningDesc}
                    audioLevel={descAudioLevel}
                    size="sm"
                    tooltip="Dictate description"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder={isListeningDesc ? 'Listening... Dictate description...' : 'Additional context or details...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="AI, Study, Project"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
