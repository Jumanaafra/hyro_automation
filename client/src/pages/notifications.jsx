import { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../components/AppShell/AppShell';
import api from '../services/api';
import {
  Bell, CheckCircle2, AlertCircle, Info, AlertTriangle,
  RefreshCw, Slack, MessageSquare, CheckCheck, Cpu
} from 'lucide-react';

const TYPE_META = {
  SUCCESS: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Success' },
  FAILURE: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Failure' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Warning' },
  INFO: { icon: Info, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', label: 'Info' }
};

const PROVIDER_ICON = {
  slack: Slack,
  discord: MessageSquare,
  system: Cpu
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [sendForm, setSendForm] = useState({ provider: 'slack', workflowName: '', type: 'SUCCESS', result: '', error: '', channel: '#general' });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data.notifications || []);
    } catch (err) {}
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    } catch (err) {}
  };

  const sendNotification = async () => {
    setSending(true);
    try {
      await api.post(`/notifications/${sendForm.provider}`, {
        workflowName: sendForm.workflowName || 'Test Workflow',
        type: sendForm.type,
        result: sendForm.result,
        error: sendForm.error,
        channel: sendForm.channel
      });
      setMsg(`✅ Sent ${sendForm.type} notification via ${sendForm.provider.toUpperCase()}`);
      fetchNotifications();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || 'Failed to send'}`);
    }
    setSending(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const filtered = filter === 'ALL' ? notifications : notifications.filter((n) => n.type === filter || n.provider === filter.toLowerCase());
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" />
                Notification Center
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold border border-indigo-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">Workflow alerts delivered via Slack, Discord & system</p>
            </div>
            <button onClick={fetchNotifications} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Send Notification Panel */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Slack className="w-4 h-4 text-amber-400" /> Send Test Notification</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Provider</label>
                <select value={sendForm.provider} onChange={(e) => setSendForm({ ...sendForm, provider: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Type</label>
                <select value={sendForm.type} onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILURE">FAILURE</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Workflow Name</label>
                <input value={sendForm.workflowName} onChange={(e) => setSendForm({ ...sendForm, workflowName: e.target.value })} placeholder="Gmail Tracker" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">{sendForm.type === 'FAILURE' ? 'Error' : 'Result'}</label>
                <input value={sendForm.type === 'FAILURE' ? sendForm.error : sendForm.result} onChange={(e) => setSendForm(sendForm.type === 'FAILURE' ? { ...sendForm, error: e.target.value } : { ...sendForm, result: e.target.value })} placeholder={sendForm.type === 'FAILURE' ? 'API rate limit' : 'Processed 12 emails'} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500" />
              </div>
              {sendForm.provider === 'slack' && (
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Channel</label>
                  <input value={sendForm.channel} onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })} placeholder="#general" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500" />
                </div>
              )}
            </div>
            {msg && <p className="text-xs text-slate-300 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">{msg}</p>}
            <button onClick={sendNotification} disabled={sending} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition disabled:opacity-50">
              {sending ? 'Sending…' : `Send via ${sendForm.provider.charAt(0).toUpperCase() + sendForm.provider.slice(1)}`}
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'SUCCESS', 'FAILURE', 'INFO', 'WARNING', 'slack', 'discord'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition ${filter === f ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Notification List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-800" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No notifications yet</p>
              <p className="text-slate-500 text-xs mt-1">Send a test notification above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((notif) => {
                const meta = TYPE_META[notif.type] || TYPE_META.INFO;
                const TypeIcon = meta.icon;
                const ProvIcon = PROVIDER_ICON[notif.provider] || Cpu;
                return (
                  <div key={notif._id} className={`glass-card p-4 rounded-2xl border flex items-start gap-3 transition ${notif.read ? 'border-slate-800 opacity-60' : 'border-indigo-500/20'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} border ${meta.border}`}>
                      <TypeIcon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{notif.title}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${meta.bg} ${meta.color} ${meta.border}`}>{meta.label}</span>
                        <span className="inline-flex items-center gap-1 text-[9px] text-slate-500">
                          <ProvIcon className="w-3 h-3" /> {notif.provider}
                        </span>
                        {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{notif.message}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{new Date(notif.createdAt).toLocaleString()}</p>
                    </div>
                    {!notif.read && (
                      <button onClick={() => markRead(notif._id)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-semibold hover:bg-slate-700 transition border border-slate-700">
                        <CheckCheck className="w-3 h-3" /> Read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
