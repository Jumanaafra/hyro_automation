import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../../components/AppShell/AppShell';
import NodePalette from '../../components/NodePalette/NodePalette';
import NodeConfigPanel from '../../components/NodeConfigPanel/NodeConfigPanel';
import { useWorkflowStore } from '../../store/workflowStore';
import { ReactFlowProvider } from '@xyflow/react';
import {
  Sparkles, Save, ArrowLeft, Loader2, GitBranch, LayoutGrid, AlertCircle, Play, CheckCircle2, Eye
} from 'lucide-react';

const WorkflowCanvas = dynamic(
  () => import('../../components/WorkflowCanvas/WorkflowCanvas'),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div> }
);

export default function WorkflowBuilder() {
  const router = useRouter();
  const { prompt: queryPrompt } = router.query;
  const {
    nodes,
    edges,
    addNode,
    createWorkflow,
    saveWorkflow,
    activeWorkflow,
    isSaving,
    isGenerating,
    generateWorkflowFromPrompt,
    autoLayout,
    resetCanvas,
    executeWorkflow,
    setNodeExecutionStatus,
    clearExecutionStatuses
  } = useWorkflowStore();

  const [prompt, setPrompt] = useState('');
  const [wfName, setWfName] = useState('New Workflow');
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState(null);

  // Handle prompt query param if redirected from Dashboard
  useEffect(() => {
    if (queryPrompt && typeof queryPrompt === 'string' && nodes.length === 0) {
      setPrompt(queryPrompt);
      generateWorkflowFromPrompt(queryPrompt).then((res) => {
        if (res?.name) setWfName(res.name);
      }).catch((e) => setErrorMsg(e.message || 'Generation failed'));
    }
  }, [queryPrompt, generateWorkflowFromPrompt, nodes.length]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setErrorMsg('');
    try {
      const generated = await generateWorkflowFromPrompt(prompt.trim());
      if (generated?.name) setWfName(generated.name);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'AI Generation failed');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleSave = async () => {
    setErrorMsg('');
    try {
      if (!activeWorkflow) {
        const wf = await createWorkflow({ name: wfName, nodes, edges });
        router.push(`/workflows/${wf._id}`);
        return wf;
      } else {
        await saveWorkflow();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        return activeWorkflow;
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Save failed');
      setTimeout(() => setErrorMsg(''), 4000);
      throw err;
    }
  };

  const handleRunWorkflow = async () => {
    setErrorMsg('');
    setExecResult(null);
    setExecuting(true);
    clearExecutionStatuses();

    try {
      let wfId = activeWorkflow?._id;
      if (!wfId) {
        const created = await createWorkflow({ name: wfName, nodes, edges });
        wfId = created._id;
      } else {
        await saveWorkflow();
      }

      nodes.forEach((n) => setNodeExecutionStatus(n.id, 'running'));
      const result = await executeWorkflow(wfId);
      setExecResult(result);
      nodes.forEach((n) => setNodeExecutionStatus(n.id, 'completed'));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Execution failed');
      nodes.forEach((n) => setNodeExecutionStatus(n.id, 'failed'));
    } finally {
      setExecuting(false);
    }
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

  const metrics = getMetrics(execResult);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
          {/* Top Toolbar */}
          <div className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0 z-10">
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
              <input
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                placeholder="Workflow Name"
                className="bg-slate-800/60 hover:bg-slate-800 focus:bg-slate-900 text-sm font-bold text-white focus:outline-none border border-slate-700/60 focus:border-indigo-500 rounded-lg px-2.5 py-1 transition truncate max-w-[200px] md:max-w-xs"
              />
              <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/50">
                <GitBranch className="w-3 h-3 text-indigo-400" /> {nodes.length} nodes • {edges.length} edges
              </span>
            </div>

            {/* AI Generator Bar */}
            <div className="flex items-center gap-2 flex-1 max-w-lg mx-2">
              <div className="relative flex-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="Describe workflow: e.g. 'Gmail job tracker to Sheets and Slack'..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition disabled:opacity-50 shrink-0"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isGenerating ? 'Generating...' : 'AI Generate'}</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={autoLayout}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition"
                title="Auto Arrange Nodes"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" /> Auto Layout
              </button>

              <button
                onClick={handleRunWorkflow}
                disabled={executing || nodes.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-md shadow-emerald-500/10 transition disabled:opacity-50"
              >
                {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {executing ? 'Running...' : 'Run Workflow'}
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </div>

          {/* Execution Result Banner */}
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
                <Eye className="w-3.5 h-3.5" /> View Execution Details
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
            </div>
          )}

          {/* Main Canvas + Panels */}
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
