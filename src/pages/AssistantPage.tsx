import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition, useSpeechSynthesis } from '../lib/useSpeech';
import { VoiceMicButton } from '../components/VoiceMicButton';
import {
  Send,
  Paperclip,
  Bot,
  Sparkles,
  Trash2,
  Mail,
  CheckSquare,
  Calendar,
  FileText,
  Check,
  X,
  Loader2,
  Brain,
  Volume2,
  VolumeX,
  Radio,
  Download,
  BookmarkPlus,
  History,
  Search,
  CheckCircle2,
  FolderArchive,
  ChevronDown,
  Clock,
  ArrowRight,
  Plus,
  Pin,
  PinOff,
  Edit2,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Save,
  Layers
} from 'lucide-react';

interface AssistantPageProps {
  setActiveTab: (tab: string) => void;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({ setActiveTab }) => {
  const {
    chatHistory,
    activeSessionId,
    activeSession,
    startNewChat,
    selectChatSession,
    renameChatSession,
    togglePinChatSession,
    sendMessageToAssistant,
    clearChatHistory,
    setIsComposeEmailOpen,
    chatSessions,
    saveChatSession,
    deleteChatSession,
    exportChatHistory,
    saveWorkspaceSnapshot,
    actionHistory,
    exportAllData
  } = useApp();

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // ChatGPT-style Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');

  // History & Session Controls
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'sessions' | 'actions'>('sessions');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [customSessionTitle, setCustomSessionTitle] = useState('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Text-To-Speech
  const { isSpeaking, speakingId, speak, stop: stopSpeaking } = useSpeechSynthesis();

  // Speech-To-Text / Microphone Hook
  const {
    isListening,
    interimTranscript,
    audioLevel,
    toggleListening,
    stopListening
  } = useSpeechRecognition({
    continuous: false,
    lang: 'en-US',
    onResult: (text) => {
      setInput(text);
    },
    onError: (err) => {
      console.warn('Voice recognition notice:', err);
      if (err === 'not-allowed') {
        setVoiceNotice('Microphone access was denied. Please allow microphone permissions in browser settings.');
      } else {
        setVoiceNotice(`Microphone status: ${err}`);
      }
      setTimeout(() => setVoiceNotice(null), 5000);
    }
  });

  const scrollToBottom = () => {
    if (!chatSearchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isSending]);

  const handleSend = async (textToSend?: string) => {
    if (isListening) {
      stopListening();
    }
    const text = textToSend || input;
    if (!text.trim() && !attachedFile) return;

    const fullMessage = attachedFile ? `[Attachment: ${attachedFile}] ${text}` : text;
    setInput('');
    setAttachedFile(null);
    setIsSending(true);

    try {
      await sendMessageToAssistant(fullMessage);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickAction = (actionText: string) => {
    handleSend(actionText);
  };

  const handleConfirmTool = async (toolName: string, args: any) => {
    setIsSending(true);
    try {
      await sendMessageToAssistant(undefined, { toolName, args });
    } finally {
      setIsSending(false);
    }
  };

  const toggleSpeakMessage = (msgId: string, content: string) => {
    if (isSpeaking && speakingId === msgId) {
      stopSpeaking();
    } else {
      speak(content, msgId);
    }
  };

  const handleSaveSnapshot = async () => {
    setIsSavingSnapshot(true);
    try {
      await saveWorkspaceSnapshot();
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleStartRename = (session: { id: string; title: string }) => {
    setEditingSessionId(session.id);
    setEditingSessionTitle(session.title);
  };

  const handleFinishRename = async (sessionId: string) => {
    if (editingSessionTitle.trim()) {
      await renameChatSession(sessionId, editingSessionTitle.trim());
    }
    setEditingSessionId(null);
  };

  const filteredSessions = chatSessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter((s) => s.pinned);
  const unpinnedSessions = filteredSessions.filter((s) => !s.pinned);

  const filteredChatHistory = chatSearchQuery.trim()
    ? chatHistory.filter((msg) =>
        msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase())
      )
    : chatHistory;

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex gap-3 animate-in fade-in">
      {/* ChatGPT-style Collapsible Chat Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-72 sm:w-80' : 'w-0 hidden md:flex md:w-0'
        } shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all duration-200`}
      >
        {/* Sidebar Header & New Chat Button */}
        <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Chat & Workspaces</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Close chat sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => startNewChat()}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <button
            onClick={handleSaveSnapshot}
            disabled={isSavingSnapshot}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            title="Saves a complete snapshot of current chat, tasks, and schedule"
          >
            {isSavingSnapshot ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <Save className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>Save Workspace & Schedule</span>
          </button>

          {/* Session Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={sessionSearchQuery}
              onChange={(e) => setSessionSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Pinned Section */}
          {pinnedSessions.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-3 h-3 text-indigo-500" /> Pinned Chats
              </div>
              {pinnedSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => selectChatSession(session.id)}
                  className={`group relative p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all border ${
                    activeSessionId === session.id
                      ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 font-semibold'
                      : 'border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activeSessionId === session.id ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editingSessionTitle}
                        onChange={(e) => setEditingSessionTitle(e.target.value)}
                        onBlur={() => handleFinishRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="px-1.5 py-0.5 bg-white border border-indigo-300 rounded text-xs text-slate-900 w-full focus:outline-none"
                      />
                    ) : (
                      <span className="truncate">{session.title}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinChatSession(session.id);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      title="Unpin"
                    >
                      <PinOff className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(session);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatSession(session.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Chats Section */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Recent Chats</span>
              <span>{filteredSessions.length}</span>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-1">
                <FolderArchive className="w-6 h-6 mx-auto opacity-40" />
                <p className="text-xs">No previous chats found</p>
              </div>
            ) : (
              unpinnedSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => selectChatSession(session.id)}
                  className={`group relative p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all border ${
                    activeSessionId === session.id
                      ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 font-semibold shadow-2xs'
                      : 'border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activeSessionId === session.id ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editingSessionTitle}
                        onChange={(e) => setEditingSessionTitle(e.target.value)}
                        onBlur={() => handleFinishRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="px-1.5 py-0.5 bg-white border border-indigo-300 rounded text-xs text-slate-900 w-full focus:outline-none"
                      />
                    ) : (
                      <div className="truncate flex flex-col text-left">
                        <span className="truncate">{session.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {session.createdAt || 'Saved'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinChatSession(session.id);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      title="Pin to top"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(session);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatSession(session.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>Audit & Logs</span>
          </button>
          <span className="text-[10px] text-slate-400">{chatSessions.length} total</span>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Top Assistant Header & Session Banner */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Open chat sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
              </button>
            )}

            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-sm text-slate-900 truncate">
                  {activeSession ? activeSession.title : 'Nexa AI Assistant'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-saved
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-indigo-600" /> Voice & Mic
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Manage tasks, calendar schedules, emails, and persistent chat sessions like ChatGPT
              </p>
            </div>
          </div>

          {/* Action Controls: Save Workspace, Search, Export, Clear */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Workspace Snapshot */}
            <button
              onClick={handleSaveSnapshot}
              disabled={isSavingSnapshot}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Save chat conversation and active schedule"
            >
              {isSavingSnapshot ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span className="hidden sm:inline">Save Workspace</span>
            </button>

            {/* In-Chat Search Toggle */}
            <button
              onClick={() => setIsSearchVisible(!isSearchVisible)}
              className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                isSearchVisible
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Search within conversation"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Export conversation or full history"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden md:inline">Export</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-30 animate-in fade-in">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Export Chat Transcript
                  </div>
                  <button
                    onClick={() => {
                      exportChatHistory('markdown');
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-xs text-slate-700 flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Markdown (.md)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportChatHistory('txt');
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-xs text-slate-700 flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Plain Text (.txt)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportChatHistory('json');
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-xs text-slate-700 flex items-center gap-2 transition-colors"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
                    <span>JSON Chat Data (.json)</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      exportAllData();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 text-xs font-semibold text-emerald-700 flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Full System Backup (All Data)</span>
                  </button>
                </div>
              )}
            </div>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stop Voice</span>
              </button>
            )}

            <button
              onClick={clearChatHistory}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-colors text-xs flex items-center gap-1.5 font-medium border border-slate-200"
              title="Archive and Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* In-Chat Search Bar */}
        {isSearchVisible && (
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 animate-in fade-in">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search within this conversation..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            {chatSearchQuery && (
              <button
                onClick={() => setChatSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsSearchVisible(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mic Warning or Permission Notice Banner */}
        {voiceNotice && (
          <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between animate-in fade-in">
            <span>{voiceNotice}</span>
            <button onClick={() => setVoiceNotice(null)} className="text-amber-700 hover:text-amber-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Chat Conversation Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          {filteredChatHistory.map((msg) => {
            const isUser = msg.role === 'user';
            const isCurrentSpeaking = isSpeaking && speakingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {!isUser ? (
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-xs font-bold text-slate-700 mt-1">
                    You
                  </div>
                )}

                {/* Content Bubble */}
                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed relative group ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm shadow-indigo-200'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Read-Aloud Voice Button on Assistant Messages */}
                    {!isUser && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <button
                          onClick={() => toggleSpeakMessage(msg.id, msg.content)}
                          className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                            isCurrentSpeaking
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60'
                          }`}
                          title={isCurrentSpeaking ? 'Stop speech playback' : 'Read aloud with Text-to-Speech'}
                        >
                          {isCurrentSpeaking ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                              <span>Speaking...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Read aloud</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Tool Call Cards */}
                    {msg.toolCall && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-indigo-600" /> Action: {msg.toolCall.name}
                          </span>
                          <span
                            className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded ${
                              msg.toolCall.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-amber-50 text-amber-600 border border-amber-200'
                            }`}
                          >
                            {msg.toolCall.status}
                          </span>
                        </div>

                        {/* Arguments Preview */}
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                          {Object.entries(msg.toolCall.args).map(([k, v]) => (
                            <div key={k} className="flex gap-2 truncate">
                              <span className="text-slate-400">{k}:</span>
                              <span className="text-indigo-600 font-semibold truncate">{String(v)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive Navigation Shortcuts for Completed Actions */}
                        {msg.toolCall.status === 'completed' && (
                          <div className="pt-1 flex items-center gap-2">
                            {msg.toolCall.name.includes('calendar') && (
                              <button
                                onClick={() => setActiveTab('calendar')}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>View in Calendar Schedule</span>
                              </button>
                            )}
                            {msg.toolCall.name.includes('task') && (
                              <button
                                onClick={() => setActiveTab('tasks')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <CheckSquare className="w-3 h-3" />
                                <span>View in Task Manager</span>
                              </button>
                            )}
                            {msg.toolCall.name.includes('email') && (
                              <button
                                onClick={() => setActiveTab('email')}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <Mail className="w-3 h-3" />
                                <span>View in Email Inbox</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Confirmation Action Buttons */}
                        {msg.confirmationRequired && msg.toolCall.status === 'pending_confirmation' && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              onClick={() => handleConfirmTool(msg.toolCall!.name, msg.toolCall!.args)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Confirm Action
                            </button>
                            <button
                              onClick={() => {
                                setIsComposeEmailOpen(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200"
                            >
                              Edit Details
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 block px-1">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}

          {filteredChatHistory.length === 0 && chatSearchQuery && (
            <div className="text-center py-10 text-slate-400 text-xs">
              No messages found matching "{chatSearchQuery}".
            </div>
          )}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 p-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Nexa AI is thinking and executing tool action...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          <button
            onClick={() => handleQuickAction('Schedule a meeting with Rahul tomorrow at 3 PM')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Schedule Meeting</span>
          </button>

          <button
            onClick={() =>
              handleQuickAction(
                'Send my professor an email saying I will submit my project tomorrow and create a task to finish it'
              )
            }
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
          >
            <Mail className="w-3.5 h-3.5 text-purple-600" />
            <span>Send Email & Task</span>
          </button>

          <button
            onClick={() => handleQuickAction('Create a task to finish Machine Learning project tomorrow')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Create Task</span>
          </button>

          <button
            onClick={() => handleQuickAction('Show my calendar events for today')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>Show Schedule</span>
          </button>
        </div>

        {/* Input Bar with Voice Mic Visualizer */}
        <div className="p-2.5 rounded-2xl bg-white border border-slate-200 flex flex-col gap-2 shrink-0 shadow-lg relative">
          {/* Active Microphone Status Pill */}
          {isListening && (
            <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>Listening to your voice... Speak now</span>
                {interimTranscript && (
                  <span className="text-slate-600 italic">"{interimTranscript}"</span>
                )}
              </div>
              <button
                onClick={stopListening}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 underline"
              >
                Done Speaking
              </button>
            </div>
          )}

          {attachedFile && (
            <div className="flex items-center justify-between px-3 py-1 rounded-xl bg-indigo-50 text-xs text-indigo-700 border border-indigo-200">
              <span className="truncate">Attached: {attachedFile}</span>
              <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-2">
            {/* File Attachment Button */}
            <label className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAttachedFile(e.target.files[0].name);
                  }
                }}
              />
            </label>

            {/* Voice Mic Button with dynamic Audio Waveform */}
            <VoiceMicButton
              isListening={isListening}
              onToggle={toggleListening}
              audioLevel={audioLevel}
              tooltip={isListening ? 'Click to stop listening' : 'Voice Input (Click and speak)'}
            />

            {/* Text Input */}
            <input
              type="text"
              placeholder={
                isListening
                  ? 'Listening... Speak your command...'
                  : 'Ask Nexa AI e.g. "Schedule meeting with Rahul tomorrow at 4 PM"...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-transparent border-none text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !attachedFile) || isSending}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-sm shadow-indigo-200 transition-all"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* History & Saved Sessions Drawer Modal */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Saved History & Activity</h3>
                  <p className="text-xs text-slate-500">Persistent transcripts and executed actions</p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="px-4 pt-3 flex gap-2 border-b border-slate-100">
              <button
                onClick={() => setHistoryTab('sessions')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  historyTab === 'sessions'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Archived Sessions ({chatSessions.length})</span>
              </button>
              <button
                onClick={() => setHistoryTab('actions')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  historyTab === 'actions'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Action Log ({actionHistory.length})</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyTab === 'sessions' ? (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-700">Save Current Workspace Snapshot</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Session title (optional)..."
                        value={customSessionTitle}
                        onChange={(e) => setCustomSessionTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => {
                          saveChatSession(customSessionTitle || undefined);
                          setCustomSessionTitle('');
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {chatSessions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <FolderArchive className="w-8 h-8 mx-auto opacity-50" />
                      <p className="text-xs">No saved sessions yet. Click "Save Session" to archive conversations.</p>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => {
                          selectChatSession(session.id);
                          setIsHistoryDrawerOpen(false);
                        }}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all space-y-2 shadow-2xs cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-xs text-slate-900 line-clamp-1 flex items-center gap-1.5">
                            {session.pinned && <Pin className="w-3 h-3 text-indigo-500 shrink-0" />}
                            {session.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(session.id);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{session.createdAt}</span>
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-600">
                            {session.messageCount} messages
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  {actionHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <Clock className="w-8 h-8 mx-auto opacity-50" />
                      <p className="text-xs">No actions logged yet. Executed tools and workflow events will appear here.</p>
                    </div>
                  ) : (
                    actionHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {item.category === 'email' && <Mail className="w-3.5 h-3.5 text-purple-600" />}
                            {item.category === 'task' && <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />}
                            {item.category === 'calendar' && <Calendar className="w-3.5 h-3.5 text-indigo-600" />}
                            {item.category === 'reminder' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                            {item.category === 'ai' && <Bot className="w-3.5 h-3.5 text-indigo-600" />}
                            {item.action}
                          </span>
                          <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.details}</p>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => exportAllData()}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Full Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
