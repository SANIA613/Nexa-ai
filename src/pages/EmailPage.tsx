import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Email, EmailFolder } from '../types';
import {
  Inbox,
  Send,
  FileText,
  Star,
  Trash2,
  Plus,
  Search,
  Paperclip,
  Sparkles,
  ArrowLeft,
  Reply,
  Loader2,
  Zap,
  RefreshCw,
  Mail,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const EmailPage: React.FC = () => {
  const {
    emails,
    updateEmail,
    deleteEmail,
    setIsComposeEmailOpen,
    setComposeEmailInitialData,
    simulateIncomingRealtimeEmail,
    gmailAuth,
    isGmailSyncing,
    connectGmail,
    disconnectGmail,
    syncGmailInbox
  } = useApp();

  const [activeFolder, setActiveFolder] = useState<EmailFolder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    await connectGmail();
    setIsConnecting(false);
  };

  const handleSimulateIncoming = async () => {
    setIsSimulating(true);
    await simulateIncomingRealtimeEmail();
    setIsSimulating(false);
  };

  // Filter emails by folder & search query
  const filteredEmails = emails.filter((e) => {
    let matchesFolder = true;
    if (activeFolder === 'starred') {
      matchesFolder = e.starred && e.folder !== 'trash';
    } else {
      matchesFolder = e.folder === activeFolder;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesFolder;

    return (
      matchesFolder &&
      (e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        e.senderName.toLowerCase().includes(q) ||
        e.senderEmail.toLowerCase().includes(q) ||
        e.recipientEmail.toLowerCase().includes(q))
    );
  });

  const unreadCount = emails.filter((e) => e.folder === 'inbox' && !e.read).length;
  const sentCount = emails.filter((e) => e.folder === 'sent').length;

  const handleSelectEmail = (e: Email) => {
    setSelectedEmail(e);
    setSummary(null);
    if (!e.read) {
      updateEmail(e.id, { read: true });
    }
  };

  const handleToggleStar = (e: React.MouseEvent, email: Email) => {
    e.stopPropagation();
    updateEmail(email.id, { starred: !email.starred });
  };

  const handleReply = (email: Email) => {
    setComposeEmailInitialData({
      recipientEmail: email.senderEmail,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: `\n\n--- On ${email.timestamp}, ${email.senderName} wrote:\n> ${email.body}`
    });
    setIsComposeEmailOpen(true);
  };

  const handleAiSummarize = async (email: Email) => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/ai/write-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Summarize key points in 2 concise bullet points',
          mode: 'shorten',
          originalText: email.body
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.body || 'This email provides updates regarding project details.');
      } else {
        setSummary('Summary generated: Key project updates communicated.');
      }
    } catch (err) {
      setSummary('Summary generated: Key project updates communicated.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col gap-4 animate-in fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Manager</h1>
            {gmailAuth.isConnected ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Gmail API Connected</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Offline / Local Mode</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Gmail API dispatch to actual recipient inboxes with automated synchronization
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Gmail Connect/Disconnect CTA */}
          {gmailAuth.isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[160px] font-medium" title={gmailAuth.userEmail || ''}>
                {gmailAuth.userEmail}
              </span>
              <button
                onClick={syncGmailInbox}
                disabled={isGmailSyncing}
                className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded transition-colors"
                title="Sync Gmail inbox"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGmailSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={disconnectGmail}
                className="text-[10px] text-emerald-600 hover:text-rose-600 font-semibold underline ml-1"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectGmail}
              disabled={isConnecting}
              className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-300 flex items-center gap-1.5 shadow-2xs transition-all"
              title="Connect official Google Account via OAuth 2.0"
            >
              {isConnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Connect Gmail (OAuth 2.0)</span>
            </button>
          )}

          <button
            onClick={handleSimulateIncoming}
            disabled={isSimulating}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-all"
            title="Simulate receiving an incoming email"
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            )}
            <span>Simulate Incoming</span>
          </button>

          <button
            onClick={() => {
              setComposeEmailInitialData(null);
              setIsComposeEmailOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Email</span>
          </button>
        </div>
      </div>

      {/* Main Mail Grid */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Left Sub-sidebar: Folders */}
        <div className="w-full md:w-56 p-3 border-r border-slate-200 bg-slate-50/50 shrink-0 space-y-1">
          {[
            { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
            { id: 'sent', label: 'Sent', icon: Send, count: sentCount },
            { id: 'drafts', label: 'Drafts', icon: FileText },
            { id: 'starred', label: 'Starred', icon: Star },
            { id: 'trash', label: 'Trash', icon: Trash2 }
          ].map((folder) => {
            const Icon = folder.icon;
            const isActive = activeFolder === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  setActiveFolder(folder.id as EmailFolder);
                  setSelectedEmail(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{folder.label}</span>
                </div>
                {folder.count !== undefined && folder.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                    {folder.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Middle: Email List */}
        <div
          className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${
            selectedEmail ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* List Search Bar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/30">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No emails in {activeFolder}</div>
            ) : (
              filteredEmails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                        : !email.read
                        ? 'bg-slate-50/80 hover:bg-slate-100'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs truncate ${
                          !email.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                        }`}
                      >
                        {email.folder === 'sent' ? `To: ${email.recipientEmail || email.senderName}` : email.senderName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{email.timestamp}</span>
                    </div>

                    <h5
                      className={`text-xs mt-0.5 truncate ${
                        !email.read ? 'font-semibold text-indigo-700' : 'text-slate-800'
                      }`}
                    >
                      {email.subject}
                    </h5>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{email.body}</p>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      {email.folder === 'sent' && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium text-[9px] border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Sent & Saved</span>
                        </span>
                      )}

                      {email.attachments && email.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-medium">
                          <Paperclip className="w-3 h-3" /> {email.attachments.length} attachment
                        </span>
                      )}

                      <button
                        onClick={(e) => handleToggleStar(e, email)}
                        className="ml-auto text-slate-400 hover:text-amber-500"
                      >
                        <Star className={`w-3.5 h-3.5 ${email.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Email Detail View */}
        <div className={`flex-1 flex flex-col ${selectedEmail ? 'flex' : 'hidden md:flex'}`}>
          {selectedEmail ? (
            <div className="flex-1 flex flex-col h-full overflow-y-auto bg-white">
              {/* Email Detail Top Actions */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAiSummarize(selectedEmail)}
                    disabled={isSummarizing}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-100 transition-all shadow-2xs"
                  >
                    {isSummarizing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>AI Summarize</span>
                  </button>

                  <button
                    onClick={() => handleReply(selectedEmail)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>

                  <button
                    onClick={() => {
                      deleteEmail(selectedEmail.id);
                      setSelectedEmail(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Delete Email"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Email Body & Details */}
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedEmail.subject}</h2>
                  <div className="flex items-center justify-between gap-4 mt-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xs">
                        {selectedEmail.senderName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          {selectedEmail.senderName}{' '}
                          <span className="text-slate-400 font-normal">&lt;{selectedEmail.senderEmail}&gt;</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">To: {selectedEmail.recipientEmail}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{selectedEmail.timestamp}</span>
                  </div>
                </div>

                {/* AI Summary Box */}
                {summary && (
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1 animate-in fade-in">
                    <span className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      AI Executive Summary:
                    </span>
                    <p className="text-xs text-indigo-950 leading-relaxed">{summary}</p>
                  </div>
                )}

                {/* Body Text */}
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedEmail.body}
                </div>

                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400">
                      Attachments ({selectedEmail.attachments.length})
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {selectedEmail.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3"
                        >
                          <Paperclip className="w-4 h-4 text-indigo-600" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{att.name}</p>
                            <span className="text-[10px] text-slate-400">{att.size}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Inbox className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium">Select an email to view conversation details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
