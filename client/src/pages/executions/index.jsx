import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../../components/AppShell/AppShell';
import api from '../../services/api';
import {
  Activity, Play, Pause, XCircle, CheckCircle2, Clock,
  ChevronRight, AlertCircle, RefreshCw
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

export default function ExecutionsPage() {
  const router = useRouter();
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/executions');
      setExecutions(res.data.data.executions || []);
    } catch (err) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" /> Executions History
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">Live monitoring and audit history for agentic workflow runs</p>
            </div>
            <button
              onClick={fetchExecutions}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl border border-slate-800">
              <Activity className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-400">No execution runs recorded</p>
              <p className="text-xs text-slate-500 mt-1">Execute a workflow from the builder or dashboard to track live execution</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((exec) => (
                <div
                  key={exec._id}
                  onClick={() => router.push(`/executions/${exec._id}`)}
                  className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-purple-500/30 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition truncate">
                          {exec.workflowSnapshot?.name || 'Workflow Execution'}
                        </h3>
                        <StatusBadge status={exec.status} />
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(exec.startTime).toLocaleString()}</span>
                        <span>Duration: {exec.duration ? `${exec.duration}ms` : 'In progress'}</span>
                        {exec.currentNode && (
                          <span className="text-purple-400 font-medium">Node: {exec.currentNode}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition ml-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
