import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../../components/AppShell/AppShell';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  Plus, Search, Workflow, Copy, Trash2, Play, ChevronRight,
  Tag, Clock, GitBranch
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    draft: 'bg-slate-700/60 text-slate-300 border-slate-600',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    archived: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] || map.draft}`}>
      {status?.toUpperCase()}
    </span>
  );
}

export default function WorkflowsPage() {
  const router = useRouter();
  const { workflows, isListLoading, fetchWorkflows, createWorkflow, duplicateWorkflow, deleteWorkflow, executeWorkflow } = useWorkflowStore();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [execMsg, setExecMsg] = useState('');

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const filtered = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const wf = await createWorkflow({ name: newName.trim(), nodes: [], edges: [] });
    setCreating(false);
    setNewName('');
    router.push(`/workflows/${wf._id}`);
  };

  const handleDuplicate = async (id, e) => {
    e.stopPropagation();
    await duplicateWorkflow(id);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('Delete this workflow? This cannot be undone.')) {
      await deleteWorkflow(id);
    }
  };

  const handleExecute = async (id, e) => {
    e.stopPropagation();
    const result = await executeWorkflow(id);
    setExecMsg(`Placeholder execution started: ${result.status}`);
    setTimeout(() => setExecMsg(''), 3000);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Workflow className="w-5 h-5 text-indigo-400" /> Workflows
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">Create, manage, and run your automation workflows</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/workflows/builder')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition"
              >
                <Plus className="w-4 h-4" /> Visual Builder
              </button>
            </div>
          </div>

          {execMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{execMsg}</div>
          )}

          {/* Create dialog */}
          {creating && (
            <div className="glass-card p-5 rounded-2xl border border-indigo-500/20">
              <h3 className="text-sm font-semibold text-white mb-3">Name your new workflow</h3>
              <div className="flex gap-3">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Gmail Job Tracker"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
                <button onClick={handleCreate} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition">Create</button>
                <button onClick={() => setCreating(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition">Cancel</button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflows..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Workflow list */}
          {isListLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl border border-slate-800">
              <Workflow className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-400">No workflows found</p>
              <p className="text-xs text-slate-500 mt-1">Create a new workflow or try generating one with AI</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((wf) => (
                <div
                  key={wf._id}
                  onClick={() => router.push(`/workflows/${wf._id}`)}
                  className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition truncate">{wf.name}</h3>
                        <StatusBadge status={wf.status} />
                      </div>
                      <p className="text-xs text-slate-400 truncate">{wf.description || 'No description'}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> {wf.nodes?.length || 0} nodes</span>
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> v{wf.version || 1}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(wf.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={(e) => handleExecute(wf._id, e)} title="Run" className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition">
                        <Play className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => handleDuplicate(wf._id, e)} title="Duplicate" className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => handleDelete(wf._id, e)} title="Delete" className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
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
