import { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../components/AppShell/AppShell';
import api from '../services/api';
import {
  Linkedin, Sparkles, Calendar, Clock, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Send, Pencil, Trash2, ThumbsUp, BookOpen
} from 'lucide-react';

const STATUS_META = {
  DRAFT: { color: 'text-slate-400', bg: 'bg-slate-700/40', border: 'border-slate-700', label: 'Draft' },
  PENDING_APPROVAL: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Pending Approval' },
  APPROVED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Approved' },
  SCHEDULED: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', label: 'Scheduled' },
  PUBLISHED: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Published' },
  FAILED: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Failed' },
  CANCELLED: { color: 'text-slate-500', bg: 'bg-slate-800', border: 'border-slate-700', label: 'Cancelled' }
};

export default function LinkedInPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [useRag, setUseRag] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const [calendarView, setCalendarView] = useState('week');
  const [calendarData, setCalendarData] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [schedulingPostId, setSchedulingPostId] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/linkedin/posts');
      setPosts(res.data.data.posts || []);
    } catch (err) {}
    setLoading(false);
  };

  const fetchCalendar = async () => {
    try {
      const res = await api.get(`/linkedin/calendar?view=${calendarView}`);
      setCalendarData(res.data.data);
    } catch (err) {}
  };

  useEffect(() => { fetchPosts(); fetchCalendar(); }, []);
  useEffect(() => { fetchCalendar(); }, [calendarView]);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 4000); };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await api.post('/linkedin/generate', { prompt, useRag });
      setGeneratedContent(res.data.data.content || '');
      setEditContent(res.data.data.content || '');
      setValidationResult(res.data.data.validation);
    } catch (err) {
      flash(`❌ ${err.response?.data?.message || 'Generation failed'}`);
    }
    setGenerating(false);
  };

  const handleValidate = async () => {
    try {
      const res = await api.post('/linkedin/validate', { content: editContent });
      setValidationResult(res.data.data);
    } catch (err) {}
  };

  const handleCreate = async () => {
    if (!editContent.trim()) return;
    setCreating(true);
    try {
      await api.post('/linkedin/posts', { content: editContent });
      flash('✅ Post created as DRAFT');
      setEditContent('');
      setGeneratedContent('');
      setValidationResult(null);
      fetchPosts();
    } catch (err) {
      flash(`❌ ${err.response?.data?.message || 'Create failed'}`);
    }
    setCreating(false);
  };

  const handleAction = async (postId, action, body = null) => {
    try {
      const method = action === 'schedule' || action === 'reschedule' ? 'patch' : 'post';
      const endpoint = action === 'reschedule'
        ? `/linkedin/posts/${postId}/schedule`
        : `/linkedin/posts/${postId}/${action}`;
      const payload = action === 'schedule' || action === 'reschedule'
        ? { scheduledAt: scheduleDate }
        : (body || null);
      const fn = method === 'patch' ? api.patch : api.post;
      await fn(endpoint, payload);
      flash(`✅ Post ${action} successful`);
      setSchedulingPostId(null);
      setScheduleDate('');
      fetchPosts();
      fetchCalendar();
    } catch (err) {
      flash(`❌ ${err.response?.data?.message || `${action} failed`}`);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-400" /> LinkedIn Scheduler
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">AI-powered content creation, approval, and scheduling</p>
            </div>
            <button onClick={() => { fetchPosts(); fetchCalendar(); }} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {msg && <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/20 text-sm text-slate-200">{msg}</div>}

          {/* AI Generation Panel */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400" /> Generate Content with AI</h3>
            <div className="flex gap-3">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Create a post about my recent Python project..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} className="w-3.5 h-3.5" />
                <BookOpen className="w-3.5 h-3.5" /> RAG grounding
              </label>
              <button onClick={handleGenerate} disabled={generating || !prompt.trim()} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition disabled:opacity-50 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>

            {generatedContent && (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => { setEditContent(e.target.value); setValidationResult(null); }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 min-h-[120px] focus:outline-none focus:border-indigo-500 resize-none"
                />
                {validationResult && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs border ${validationResult.valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                    {validationResult.valid ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{validationResult.valid ? 'Content looks good — no unsupported claims detected.' : `Warning: ${validationResult.warning}`}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleValidate} className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition">Validate</button>
                  <button onClick={handleCreate} disabled={creating} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition disabled:opacity-50 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" /> {creating ? 'Saving…' : 'Save as Draft'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Calendar */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-400" /> Publishing Calendar</h3>
              <div className="flex gap-2">
                {['week', 'month'].map((v) => (
                  <button key={v} onClick={() => setCalendarView(v)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${calendarView === v ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {calendarData ? (
              <div>
                <p className="text-xs text-slate-500 mb-3">
                  {calendarData.view === 'week' ? 'This week' : 'This month'} — {calendarData.count} scheduled post{calendarData.count !== 1 ? 's' : ''}
                </p>
                {calendarData.count === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No posts scheduled for this period</p>
                ) : (
                  <div className="space-y-2">
                    {calendarData.posts.map((post) => {
                      const meta = STATUS_META[post.status] || STATUS_META.SCHEDULED;
                      return (
                        <div key={post._id} className={`flex items-center gap-3 p-3 rounded-xl border ${meta.border} ${meta.bg}`}>
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${meta.color}`} />
                          <span className="text-xs text-slate-300 flex-1 truncate">{post.content?.slice(0, 80)}…</span>
                          <span className="text-[10px] text-slate-500">{new Date(post.scheduledAt).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : <div className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />}
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">All Posts</h3>
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-800" />)
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Linkedin className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">No posts yet — generate one above</p>
              </div>
            ) : (
              posts.map((post) => {
                const meta = STATUS_META[post.status] || STATUS_META.DRAFT;
                return (
                  <div key={post._id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate-200 flex-1">{post.content}</p>
                      <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.bg} ${meta.color} ${meta.border}`}>{meta.label}</span>
                    </div>
                    {post.ragGrounded && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400"><BookOpen className="w-3 h-3" /> RAG-grounded</span>
                    )}
                    {post.scheduledAt && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled: {new Date(post.scheduledAt).toLocaleString()}</p>
                    )}

                    {/* Action buttons based on status */}
                    <div className="flex gap-2 flex-wrap">
                      {post.status === 'DRAFT' && (
                        <button onClick={() => handleAction(post._id, 'submit')} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold hover:opacity-90 transition">Submit for Approval</button>
                      )}
                      {post.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => handleAction(post._id, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold hover:opacity-90 transition flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Approve</button>
                      )}
                      {post.status === 'APPROVED' && (
                        <>
                          {schedulingPostId === post._id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white" />
                              <button onClick={() => handleAction(post._id, 'schedule')} disabled={!scheduleDate} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-semibold disabled:opacity-50">Confirm</button>
                              <button onClick={() => setSchedulingPostId(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setSchedulingPostId(post._id)} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> Schedule</button>
                          )}
                          <button onClick={() => handleAction(post._id, 'publish')} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold flex items-center gap-1"><Send className="w-3 h-3" /> Publish Now</button>
                        </>
                      )}
                      {post.status === 'SCHEDULED' && (
                        <>
                          {schedulingPostId === post._id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white" />
                              <button onClick={() => handleAction(post._id, 'reschedule')} disabled={!scheduleDate} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-semibold disabled:opacity-50">Reschedule</button>
                              <button onClick={() => setSchedulingPostId(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setSchedulingPostId(post._id)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold flex items-center gap-1"><Pencil className="w-3 h-3" /> Reschedule</button>
                          )}
                          <button onClick={() => handleAction(post._id, 'cancel')} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancel</button>
                        </>
                      )}
                      {(post.status === 'PUBLISHED' || post.status === 'FAILED' || post.status === 'CANCELLED') && (
                        <span className="text-[10px] text-slate-500">{post.publishedAt ? `Published: ${new Date(post.publishedAt).toLocaleString()}` : post.failureReason || ''}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
