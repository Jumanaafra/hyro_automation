import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../../components/AppShell/AppShell';
import api from '../../services/api';
import {
  Activity, Pause, Play, XCircle, ArrowLeft, Loader2,
  CheckCircle2, AlertCircle, Clock, Cpu, Layers, ShieldCheck, RefreshCw
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    RUNNING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    RETRYING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    PAUSED: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    CANCELLED: 'bg-slate-700/60 text-slate-400 border-slate-600'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] || map.PENDING}`}>
      {status}
    </span>
  );
}

const agentColorMap = {
  planner: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  execution: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  validation: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  recovery: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  monitoring: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  orchestrator: 'text-slate-300 border-slate-700 bg-slate-800'
};

export default function ExecutionDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [execution, setExecution] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const [execRes, timeRes] = await Promise.all([
        api.get(`/executions/${id}`),
        api.get(`/executions/${id}/timeline`)
      ]);
      setExecution(execRes.data.data.execution);
      setTimeline(timeRes.data.data);
    } catch (err) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handlePause = async () => {
    await api.post(`/executions/${id}/pause`);
    fetchDetails();
  };

  const handleResume = async () => {
    await api.post(`/executions/${id}/resume`);
    fetchDetails();
  };

  const handleApprove = async () => {
    await api.post(`/executions/${id}/approve`);
    fetchDetails();
  };

  const handleReject = async () => {
    if (confirm('Reject and cancel this execution?')) {
      await api.post(`/executions/${id}/reject`);
      fetchDetails();
    }
  };

  if (loading || !execution) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/executions')} className="text-slate-400 hover:text-slate-200 transition">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{execution.workflowSnapshot?.name || 'Execution Details'}</h2>
                  <StatusBadge status={execution.status} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Execution ID: {execution._id}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {execution.status === 'WAITING_FOR_APPROVAL' && (
                <>
                  <button onClick={handleApprove} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Continue
                  </button>
                  <button onClick={handleReject} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </>
              )}
              {execution.status === 'RUNNING' && (
                <button onClick={handlePause} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition">
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              )}
              {execution.status === 'PAUSED' && (
                <button onClick={handleResume} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition">
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
              )}
              {(execution.status === 'RUNNING' || execution.status === 'PAUSED') && (
                <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition">
                  <XCircle className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
              <button onClick={fetchDetails} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Substrate & Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">LangGraph Substrate</span>
              <p className="text-sm font-bold text-white mt-1 capitalize">{timeline?.langGraph || 'not-installed'}</p>
            </div>
            <div className="glass-card p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Duration</span>
              <p className="text-sm font-bold text-white mt-1">{execution.duration ? `${execution.duration}ms` : 'In progress'}</p>
            </div>
            <div className="glass-card p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Retry Count</span>
              <p className="text-sm font-bold text-white mt-1">{execution.retryCount || 0}</p>
            </div>
          </div>

          {/* Live Agent Timeline */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" /> Five-Agent Execution Timeline
            </h3>

            {!timeline?.events || timeline.events.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Waiting for agent timeline events...</p>
            ) : (
              <div className="space-y-3">
                {timeline.events.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${agentColorMap[evt.agent] || agentColorMap.orchestrator}`}>
                      {evt.agent}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{evt.message}</p>
                      {evt.nodeId && <span className="text-[10px] text-purple-400 font-mono">Node: {evt.nodeId}</span>}
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
