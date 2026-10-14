import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../lib/useSpeech';
import { VoiceMicButton } from './VoiceMicButton';
import { X, Send, Sparkles, Paperclip, FileText, Loader2, Wand2 } from 'lucide-react';

export const ComposeEmailModal: React.FC = () => {
  const {
    isComposeEmailOpen,
    setIsComposeEmailOpen,
    composeEmailInitialData,
    setComposeEmailInitialData,
    sendEmail,
    generateAIEmailText,
    gmailAuth
  } = useApp();

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);

  // AI Writer state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiBox, setShowAiBox] = useState(false);

  // Voice speech recognition for Body Dictation
  const {
    isListening: isListeningBody,
    audioLevel: bodyAudioLevel,
    toggleListening: toggleListeningBody
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setBody((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  });

  // Voice speech recognition for AI Prompt Dictation
  const {
    isListening: isListeningPrompt,
    audioLevel: promptAudioLevel,
    toggleListening: toggleListeningPrompt
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setAiPrompt(transcript);
    }
  });

  useEffect(() => {
    if (composeEmailInitialData) {
      setTo(composeEmailInitialData.recipientEmail || '');
      setSubject(composeEmailInitialData.subject || '');
      setBody(composeEmailInitialData.body || '');
      setCc(composeEmailInitialData.cc || '');
      setBcc(composeEmailInitialData.bcc || '');
    } else {
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setAttachments([]);
    }
  }, [composeEmailInitialData, isComposeEmailOpen]);

  if (!isComposeEmailOpen) return null;

  const handleClose = () => {
    setIsComposeEmailOpen(false);
    setComposeEmailInitialData(null);
  };

  const handleSend = async (asDraft = false) => {
    if (!to.trim() && !asDraft) return;
    await sendEmail({
      recipientEmail: to,
      cc,
      bcc,
      subject: subject || '(No Subject)',
      body,
      folder: asDraft ? 'drafts' : 'sent',
      attachments
    });
    handleClose();
  };

  const handleAiAction = async (mode: 'generate' | 'improve' | 'shorten' | 'professional' | 'friendly') => {
    setIsAiLoading(true);
    try {
      const res = await generateAIEmailText(
        aiPrompt || 'Write professional email',
        mode,
        body
      );
      if (res.subject && !subject) setSubject(res.subject);
      if (res.body) setBody(res.body);
      setShowAiBox(false);
      setAiPrompt('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAtts = Array.from(files).map((f: File) => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(0)} KB`
      }));
      setAttachments((prev) => [...prev, ...newAtts]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-400" />
            New Email Message
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* To Field */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-xs">
            <span className="w-12 text-slate-400 font-medium">To:</span>
            <input
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 bg-transparent border-none text-slate-100 focus:outline-none"
            />
            {!showCcBcc && (
              <button
                onClick={() => setShowCcBcc(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Cc / Bcc
              </button>
            )}
          </div>

          {showCcBcc && (
            <>
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-xs">
                <span className="w-12 text-slate-400 font-medium">Cc:</span>
                <input
                  type="email"
                  placeholder="cc@example.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="flex-1 bg-transparent border-none text-slate-100 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-xs">
                <span className="w-12 text-slate-400 font-medium">Bcc:</span>
                <input
                  type="email"
                  placeholder="bcc@example.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="flex-1 bg-transparent border-none text-slate-100 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Subject Field */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-xs">
            <span className="w-12 text-slate-400 font-medium">Subject:</span>
            <input
              type="text"
              placeholder="Enter subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-transparent border-none text-slate-100 focus:outline-none font-medium"
            />
          </div>

          {/* AI Generator Panel Toggle */}
          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={() => setShowAiBox(!showAiBox)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-indigo-300 font-medium text-xs hover:bg-indigo-600/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showAiBox ? 'Close AI Assistant' : 'AI Write Email'}</span>
            </button>

            {/* Dictate email button */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{isListeningBody ? 'Listening to voice dictation...' : 'Voice dictation:'}</span>
              <VoiceMicButton
                isListening={isListeningBody}
                onToggle={toggleListeningBody}
                audioLevel={bodyAudioLevel}
                size="sm"
                tooltip="Dictate email body by speaking"
              />
            </div>
          </div>

          {/* AI Assistance Box */}
          {showAiBox && (
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  Describe what you want to write or refine:
                </span>
                <VoiceMicButton
                  isListening={isListeningPrompt}
                  onToggle={toggleListeningPrompt}
                  audioLevel={promptAudioLevel}
                  size="sm"
                  tooltip="Speak AI Prompt"
                />
              </div>
              <input
                type="text"
                placeholder={isListeningPrompt ? 'Listening... Speak prompt...' : 'e.g. "Write a polite email asking Professor Sharma for an extension"'}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => handleAiAction('generate')}
                  disabled={isAiLoading}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1"
                >
                  {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Generate
                </button>
                {body && (
                  <>
                    <button
                      onClick={() => handleAiAction('professional')}
                      disabled={isAiLoading}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs"
                    >
                      Make Professional
                    </button>
                    <button
                      onClick={() => handleAiAction('friendly')}
                      disabled={isAiLoading}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs"
                    >
                      Make Friendly
                    </button>
                    <button
                      onClick={() => handleAiAction('shorten')}
                      disabled={isAiLoading}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs"
                    >
                      Shorten
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Email Body TextArea */}
          <textarea
            rows={8}
            placeholder={
              isListeningBody
                ? 'Listening to your microphone... Speak your message now...'
                : 'Write your email message here or click the microphone to dictate...'
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none font-sans leading-relaxed"
          />

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{att.name}</span>
                  <span className="text-[10px] text-slate-500">({att.size})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs font-medium">
              <Paperclip className="w-4 h-4" />
              <span>Attach files</span>
              <input type="file" multiple className="hidden" onChange={handleFileUpload} />
            </label>

            {gmailAuth.isConnected ? (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Inbox: {gmailAuth.userEmail}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">
                Local Queue Mode
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleSend(true)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSend(false)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send in Real-Time</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
