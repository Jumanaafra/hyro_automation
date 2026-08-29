import { Mail, Calendar, Webhook, Bot, FileText, ListFilter, Sheet, Slack, MessageSquare, Linkedin, GitBranch, CheckSquare } from 'lucide-react';

const NODE_CATEGORIES = [
  {
    label: 'Triggers',
    color: 'indigo',
    nodes: [
      { type: 'gmailTrigger', label: 'Gmail Trigger', icon: Mail, desc: 'Trigger on incoming Gmail emails' },
      { type: 'scheduleTrigger', label: 'Schedule Trigger', icon: Calendar, desc: 'Run on a time schedule' },
      { type: 'webhookTrigger', label: 'Webhook Trigger', icon: Webhook, desc: 'Trigger via HTTP webhook' }
    ]
  },
  {
    label: 'AI Agents',
    color: 'purple',
    nodes: [
      { type: 'aiEmailClassifier', label: 'AI Classifier', icon: Bot, desc: 'Classify emails with AI' },
      { type: 'aiDetailExtractor', label: 'AI Extractor', icon: FileText, desc: 'Extract structured fields with AI' },
      { type: 'aiSummarizer', label: 'AI Summarizer', icon: ListFilter, desc: 'Summarize content with AI' }
    ]
  },
  {
    label: 'Integrations',
    color: 'emerald',
    nodes: [
      { type: 'googleSheetsAppend', label: 'Google Sheets', icon: Sheet, desc: 'Append rows to a spreadsheet' },
      { type: 'slackPostMessage', label: 'Slack Message', icon: Slack, desc: 'Post a message to Slack' },
      { type: 'discordPostMessage', label: 'Discord Message', icon: MessageSquare, desc: 'Post a bot message to Discord' },
      { type: 'linkedinPost', label: 'LinkedIn Post', icon: Linkedin, desc: 'Publish or schedule a LinkedIn post' }
    ]
  },
  {
    label: 'Control Flow',
    color: 'amber',
    nodes: [
      { type: 'conditionBranch', label: 'Condition / Branch', icon: GitBranch, desc: 'Branch execution by condition' },
      { type: 'approvalGate', label: 'Approval Gate', icon: CheckSquare, desc: 'Pause and await human approval' }
    ]
  }
];

const colorMap = {
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400'
};

export default function NodePalette({ onAddNode }) {
  const handleDragStart = (e, nodeType) => {
    e.dataTransfer.setData('application/hyro-node-type', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-60 bg-slate-900 border-r border-slate-800 overflow-y-auto flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Node Palette</h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Drag onto canvas or click to add</p>
      </div>

      <div className="p-3 space-y-4 flex-1">
        {NODE_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-2 px-1 ${colorMap[cat.color].split(' ').find(c => c.startsWith('text-'))}`}>
              {cat.label}
            </h4>
            <div className="space-y-1.5">
              {cat.nodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node.type)}
                    onClick={() => onAddNode && onAddNode(node.type)}
                    title={node.desc}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing hover:opacity-90 transition select-none ${colorMap[cat.color]}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{node.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
