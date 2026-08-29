import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  Mail, Calendar, Webhook, Bot, FileText, ListFilter,
  Sheet, Slack, MessageSquare, Linkedin, GitBranch, CheckSquare,
  CheckCircle2, Clock, AlertCircle, Loader2, Sparkles, LayoutGrid, X
} from 'lucide-react';

const nodeMeta = {
  gmailTrigger: { label: 'Gmail Trigger', icon: Mail, color: '#6366f1', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  scheduleTrigger: { label: 'Schedule Trigger', icon: Calendar, color: '#6366f1', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  webhookTrigger: { label: 'Webhook Trigger', icon: Webhook, color: '#6366f1', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  aiEmailClassifier: { label: 'AI Classifier', icon: Bot, color: '#a855f7', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  aiDetailExtractor: { label: 'AI Detail Extractor', icon: FileText, color: '#a855f7', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  aiSummarizer: { label: 'AI Summarizer', icon: ListFilter, color: '#a855f7', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  googleSheetsAppend: { label: 'Google Sheets Append', icon: Sheet, color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  slackPostMessage: { label: 'Slack Message', icon: Slack, color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  discordPostMessage: { label: 'Discord Message', icon: MessageSquare, color: '#6366f1', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  linkedinPost: { label: 'LinkedIn Post', icon: Linkedin, color: '#0ea5e9', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  conditionBranch: { label: 'Condition Branch', icon: GitBranch, color: '#ec4899', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  approvalGate: { label: 'Approval Gate', icon: CheckSquare, color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' }
};

// ── Custom Node Renderer with Handles ──────────────────────────────────────
function HyroNode({ id, data, selected }) {
  const { deleteNode, executionNodeStatuses } = useWorkflowStore();
  const nodeType = data.nodeType || 'custom';
  const meta = nodeMeta[nodeType] || { label: 'Custom Node', icon: Bot, color: '#6366f1', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' };
  const Icon = meta.icon;
  const execStatus = executionNodeStatuses?.[id] || data.executionStatus; // 'running', 'completed', 'failed', 'pending'

  return (
    <div
      style={{
        borderColor: selected ? meta.color : undefined,
        boxShadow: selected ? `0 0 0 2px ${meta.color}40, 0 10px 25px -5px rgba(0, 0, 0, 0.5)` : '0 4px 15px -3px rgba(0, 0, 0, 0.4)'
      }}
      className={`group relative px-4 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-md border ${
        selected ? 'border-indigo-500' : 'border-slate-800'
      } text-white min-w-[180px] max-w-[240px] select-none transition-all duration-200 hover:border-slate-700`}
    >
      {/* Target Handle (Input on Top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="!w-3 !h-3 !-top-1.5 !bg-indigo-500 !border-2 !border-slate-900 !rounded-full transition-transform hover:!scale-150 !cursor-crosshair"
      />

      {/* Delete button on hover/selection */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteNode(id);
        }}
        title="Delete node"
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Node Header */}
      <div className="flex items-center gap-2.5 mb-1.5">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg} ${meta.border} border`}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider block truncate" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-xs font-semibold text-slate-200 block truncate">
            {data.label || meta.label}
          </span>
        </div>
      </div>

      {/* Quick Config or Status info */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
        <span className="font-mono text-slate-500 truncate">{id}</span>
        {execStatus === 'completed' && (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Done
          </span>
        )}
        {execStatus === 'running' && (
          <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Running
          </span>
        )}
        {execStatus === 'failed' && (
          <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        )}
        {!execStatus && (
          <span className="text-slate-500">Ready</span>
        )}
      </div>

      {/* Source Handle (Output on Bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="!w-3 !h-3 !-bottom-1.5 !bg-indigo-500 !border-2 !border-slate-900 !rounded-full transition-transform hover:!scale-150 !cursor-crosshair"
      />
    </div>
  );
}

const nodeTypes = {
  custom: HyroNode,
  gmailTrigger: HyroNode,
  scheduleTrigger: HyroNode,
  webhookTrigger: HyroNode,
  aiEmailClassifier: HyroNode,
  aiDetailExtractor: HyroNode,
  aiSummarizer: HyroNode,
  googleSheetsAppend: HyroNode,
  slackPostMessage: HyroNode,
  discordPostMessage: HyroNode,
  linkedinPost: HyroNode,
  conditionBranch: HyroNode,
  approvalGate: HyroNode
};

export default function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    addNode,
    autoLayout
  } = useWorkflowStore();
  const canvasRef = useRef(null);

  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('application/hyro-node-type');
      if (!nodeType) return;

      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = {
        x: e.clientX - bounds.left - 90,
        y: e.clientY - bounds.top - 30
      };
      addNode(nodeType, position);
    },
    [addNode]
  );

  // Validate connections before adding: no self loops
  const isValidConnection = useCallback(
    (connection) => {
      if (connection.source === connection.target) return false;
      // Disallow duplicate edges
      const isDuplicate = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      );
      return !isDuplicate;
    },
    [edges]
  );

  return (
    <div className="flex-1 relative h-full w-full" ref={canvasRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        defaultEdgeOptions={{
          animated: true,
          type: 'smoothstep',
          style: { stroke: '#818cf8', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#818cf8',
            width: 16,
            height: 16
          }
        }}
        style={{ background: '#0b0f19' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(99,102,241,0.15)" />
        <Controls className="!border-slate-800 !bg-slate-900 !text-slate-300 !rounded-xl !overflow-hidden" />
        <MiniMap
          nodeColor={(n) => '#6366f1'}
          maskColor="rgba(15,23,42,0.85)"
          className="!border-slate-800 !bg-slate-900 !rounded-xl !overflow-hidden"
        />

        {/* Top Floating Action Panel */}
        <Panel position="top-right">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-xl">
            <button
              onClick={autoLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold transition"
              title="Automatically arrange nodes in sequence"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Auto Layout
            </button>
          </div>
        </Panel>

        {nodes.length === 0 && (
          <Panel position="center">
            <div className="text-center pointer-events-none select-none max-w-sm glass-card p-8 rounded-2xl border border-slate-800/80">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-bold text-slate-300 mb-1">Canvas is Ready</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Drag nodes from the left palette or type a prompt in the top bar to auto-generate a connected workflow.
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
