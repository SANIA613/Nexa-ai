import React from 'react';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../lib/useSpeech';
import { VoiceMicButton } from './VoiceMicButton';
import { Search, X, CheckSquare, Mail, Calendar, BellRing, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  setActiveTab: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ setActiveTab }) => {
  const { searchQuery, setSearchQuery, searchResults, isSearchOpen, setIsSearchOpen } = useApp();

  const { isListening, audioLevel, toggleListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setSearchQuery(transcript);
    }
  });

  if (!isSearchOpen) return null;

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setIsSearchOpen(false);
  };

  const totalResults =
    searchResults.tasks.length +
    searchResults.emails.length +
    searchResults.events.length +
    searchResults.reminders.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Search Input Bar with Voice Mic */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            placeholder={isListening ? 'Listening... Speak search term...' : 'Search emails, tasks, calendar meetings, reminders...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-none text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />

          {/* Voice Search Mic Button */}
          <VoiceMicButton
            isListening={isListening}
            onToggle={toggleListening}
            audioLevel={audioLevel}
            size="sm"
            tooltip={isListening ? 'Stop voice search' : 'Search by voice'}
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md bg-slate-800"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!searchQuery.trim() ? (
            <div className="py-12 text-center">
              <Search className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">Search anything across Nexa AI</p>
              <p className="text-xs text-slate-500 mt-1">Try "Python project", "Rahul", "Extension", or click the microphone to speak</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No matching tasks, emails, calendar events, or reminders found for "{searchQuery}".
            </div>
          ) : (
            <>
              {/* Tasks */}
              {searchResults.tasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tasks ({searchResults.tasks.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleNavigate('tasks')}
                        className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div>
                          <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-300">
                            {task.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Status: <span className="capitalize">{task.status.replace('_', ' ')}</span> • Priority:{' '}
                            <span className="capitalize">{task.priority}</span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emails */}
              {searchResults.emails.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Emails ({searchResults.emails.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.emails.map((email) => (
                      <div
                        key={email.id}
                        onClick={() => handleNavigate('email')}
                        className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div>
                          <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-300">
                            {email.subject}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            From: {email.senderName} ({email.senderEmail})
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendar Events */}
              {searchResults.events.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Calendar Meetings ({searchResults.events.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.events.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => handleNavigate('calendar')}
                        className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div>
                          <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-300">
                            {event.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {event.date} at {event.startTime} - {event.endTime} ({event.location || 'Online'})
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminders */}
              {searchResults.reminders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Reminders ({searchResults.reminders.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.reminders.map((rem) => (
                      <div
                        key={rem.id}
                        onClick={() => handleNavigate('reminders')}
                        className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div>
                          <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-300">
                            {rem.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">{rem.datetime}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Press ESC to close</span>
          <span>Nexa AI Voice & Global Search</span>
        </div>
      </div>
    </div>
  );
};
