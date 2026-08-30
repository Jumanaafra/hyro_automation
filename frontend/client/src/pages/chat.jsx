import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../components/AppShell/AppShell';
import { useChatStore } from '../store/chatStore';
import {
  MessageSquare, Send, Plus, Bot, User, BookOpen, ExternalLink,
  Loader2, Sparkles, ChevronDown, ChevronUp, Workflow
} from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const {
    conversations, activeConversationId, messages, isQuerying,
    fetchConversations, selectConversation, sendQuery, startNewConversation
  } = useChatStore();

  const [input, setInput] = useState('');
  const [expandedSources, setExpandedSources] = useState({});

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isQuerying) return;
    const msg = input;
    setInput('');
    sendQuery(msg);
  };

  const toggleSources = (index) => {
    setExpandedSources((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleConvertToWorkflow = (text) => {
    router.push({
      pathname: '/workflows/builder',
      query: { prompt: `Automation based on knowledge context: ${text.substring(0, 100)}` }
    });
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex h-[calc(100vh-6rem)] gap-6">
          {/* Conversation History Sidebar */}
          <div className="w-64 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversations</h3>
              <button
                onClick={startNewConversation}
                className="p-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="p-2 space-y-1 flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-500 p-3 text-center">No previous chats</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => selectConversation(c._id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition truncate flex items-center gap-2 ${
                      activeConversationId === c._id
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Stream */}
          <div className="flex-1 glass-card rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">HYRO RAG Assistant</h2>
                  <p className="text-[10px] text-slate-400">Grounded strictly on your uploaded knowledge documents</p>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <BookOpen className="w-12 h-12 text-indigo-500/20 mb-3" />
                  <h3 className="text-sm font-semibold text-slate-300">Ask HYRO Knowledge Base</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Query your documents, extract facts, or turn retrieved context directly into automated visual workflows.
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 max-w-3xl ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                      }`}
                    >
                      {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className="space-y-2">
                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap'
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Source References Drawer for Assistant Messages */}
                      {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px]">
                          <button
                            onClick={() => toggleSources(idx)}
                            className="flex items-center justify-between w-full text-indigo-400 font-semibold hover:underline"
                          >
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" /> Source References ({m.sources.length})
                            </span>
                            {expandedSources[idx] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {expandedSources[idx] && (
                            <div className="mt-2.5 space-y-2 border-t border-slate-800 pt-2">
                              {m.sources.map((src, sIdx) => (
                                <div key={sIdx} className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                                  <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                                    <span>📄 {src.documentName}</span>
                                    <span className="text-[10px] text-slate-500">Chunk #{src.chunkIndex}</span>
                                  </div>
                                  <p className="text-slate-400 text-[10px] italic">"{src.snippet}"</p>
                                </div>
                              ))}

                              <button
                                onClick={() => handleConvertToWorkflow(m.content)}
                                className="mt-2 w-full py-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 font-semibold text-[10px] flex items-center justify-center gap-1 transition"
                              >
                                <Workflow className="w-3 h-3" /> Create Workflow from Context
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isQuerying && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    Searching knowledge vector store and grounding response...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-4 bg-slate-900/60 border-t border-slate-800 flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your project documents, certificates, or career notes..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || isQuerying}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-xs hover:opacity-95 flex items-center gap-2 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
