import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../../components/AppShell/AppShell';
import NodePalette from '../../components/NodePalette/NodePalette';
import NodeConfigPanel from '../../components/NodeConfigPanel/NodeConfigPanel';
import { useWorkflowStore } from '../../store/workflowStore';
import { useAuthStore } from '../../store/authStore';
import { ReactFlowProvider } from '@xyflow/react';
import {
  Save, Play, Copy, Trash2, ArrowLeft, Loader2, GitBranch, Tag,
  CheckCircle2, AlertCircle, LayoutGrid, Eye
} from 'lucide-react';

const WorkflowCanvas = dynamic(
  () => import('../../components/WorkflowCanvas/WorkflowCanvas'),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div> }
);

function StatusBadge({ status }) {
  const map = {
    draft: 'bg-slate-700/60 text-slate-300 border-slate-600',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    archived: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] || map.draft}`}>
      {status?.toUpperCase() || 'DRAFT'}
    </span>
  );
}

export default function WorkflowDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuthStore();
  const {
    activeWorkflow,
    nodes,
    edges,
    isLoading,
    fetchWorkflow,
    saveWorkflow,
    duplicateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    addNode,
    autoLayout,
    isSaving,
    resetCanvas,
    setNodeExecutionStatus,
    clearExecutionStatuses
  } = useWorkflowStore();

  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [execError, setExecError] = useState(null);
  const [saved, setSaved] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (id) fetchWorkflow(id);
    return () => resetCanvas();
  }, [id, fetchWorkflow, resetCanvas]);

  // Connect Socket.IO for real-time node execution highlights
  useEffect(() => {
    if (!token) return;
    const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || rawApi.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('node:status', (data) => {
      if (data?.nodeId && data?.status) {
        setNodeExecutionStatus(data.nodeId, data.status);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, setNodeExecutionStatus]);

  const handleSave = async () => {
    try {
      await saveWorkflow();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDuplicate = async () => {
    const clone = await duplicateWorkflow(id);
    router.push(`/workflows/${clone._id}`);
  };

  const handleDelete = async () => {
    if (confirm('Delete this workflow? This cannot be undone.')) {
      await deleteWorkflow(id);
      router.push('/workflows');
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setExecResult(null);
    setExecError(null);
    clearExecutionStatuses();

    // Mark all nodes as running progressively
    nodes.forEach((n) => setNodeExecutionStatus(n.id, 'running'));

    try {
      // First save current state before executing
      await saveWorkflow();
      const result = await executeWorkflow(id);
      if (result.status === 'FAILED' || result.error) {
        setExecError(result.error || 'Execution failed');
        nodes.forEach((n) => setNodeExecutionStatus(n.id, 'failed'));
      } else {
        setExecResult(result);
        nodes.forEach((n) => setNodeExecutionStatus(n.id, 'completed'));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Execution failed';
      setExecError(msg);
      nodes.forEach((n) => setNodeExecutionStatus(n.id, 'failed'));
    }
    setExecuting(false);
  };

  const getMetrics = (res) => {
    if (!res) return { emailsScanned: 0, jobEmailsFound: 0, jobsExtracted: 0, rowsAdded: 0 };
    const outputs = res.outputs || {};
    let emailsScanned = 0;
    let jobEmailsFound = 0;
    let jobsExtracted = 0;
    let rowsAdded = 0;

    for (const out of Object.values(outputs)) {
      const d = out?.data || out || {};
      if (d.emails || d.fetchedEmails !== undefined || out.fetchedEmails !== undefined) {
        emailsScanned = d.count ?? d.fetchedEmails ?? out.fetchedEmails ?? d.emails?.length ?? 0;
      }
      if (d.jobCount !== undefined || out.jobCount !== undefined) {
        jobEmailsFound = d.jobCount ?? out.jobCount ?? 0;
      }
      if (d.records && (d.targetFields || out.targetFields)) {
        jobsExtracted = d.count ?? d.records?.length ?? 0;
      }
      if (d.rowsAppended !== undefined || out.rowsAppended !== undefined) {
        rowsAdded = d.rowsAppended ?? out.rowsAppended ?? 0;
      }
    }
    return { emailsScanned, jobEmailsFound, jobsExtracted, rowsAdded };
  };

  if (isLoading || !activeWorkflow) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  const metrics = getMetrics(execResult);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
          {/* Top Toolbar */}
          <div className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  resetCanvas();
                  router.push('/workflows');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold text-white truncate max-w-[180px] md:max-w-xs">
                  {activeWorkflow.name}
                </span>
                <StatusBadge status={activeWorkflow.status} />
                <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                  v{activeWorkflow.version || 1} • {nodes.length} nodes
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={autoLayout}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition"
                title="Auto Arrange Nodes"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" /> Auto Layout
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved ✓' : 'Save'}
              </button>

              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 transition disabled:opacity-50"
              >
                {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {executing ? 'Running...' : 'Run Workflow'}
              </button>
            </div>
          </div>

          {/* Execution Output Banner */}
          {execResult && (
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-white">
                    Workflow Completed Successfully ({execResult.duration || 0}ms)
                  </p>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    Emails scanned: {metrics.emailsScanned}
                    {metrics.emailsScanned === 0 ? ' (No new matching emails in Gmail)' : ''} •
                    Job emails found: {metrics.jobEmailsFound} •
                    Jobs extracted: {metrics.jobsExtracted} •
                    Rows added to Google Sheets: {metrics.rowsAdded}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/executions/${execResult._id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold transition"
              >
                <Eye className="w-3.5 h-3.5" /> View Execution Logs
              </button>
            </div>
          )}

          {execError && (
            <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span><strong>Execution Failed:</strong> {execError}</span>
            </div>
          )}

          {/* Canvas layout */}
          <div className="flex flex-1 overflow-hidden relative">
            <NodePalette onAddNode={(type) => addNode(type)} />
            <ReactFlowProvider>
              <WorkflowCanvas />
            </ReactFlowProvider>
            <NodeConfigPanel />
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
