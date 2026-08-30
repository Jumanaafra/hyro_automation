import { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  Settings, X, Save, Mail, Calendar, Bot, FileText, Sheet, Slack,
  MessageSquare, Linkedin, GitBranch, CheckSquare, Webhook, ListFilter
} from 'lucide-react';

const nodeIconMap = {
  gmailTrigger: Mail,
  scheduleTrigger: Calendar,
  webhookTrigger: Webhook,
  aiEmailClassifier: Bot,
  aiDetailExtractor: FileText,
  aiSummarizer: ListFilter,
  googleSheetsAppend: Sheet,
  slackPostMessage: Slack,
  discordPostMessage: MessageSquare,
  linkedinPost: Linkedin,
  conditionBranch: GitBranch,
  approvalGate: CheckSquare
};

const configFieldsMap = {
  gmailTrigger: [
    { key: 'searchQuery', label: 'Email Search Query', placeholder: 'subject:job OR subject:certificate', type: 'text' },
    { key: 'maxResults', label: 'Max Emails to Fetch', placeholder: '10', type: 'number' }
  ],
  aiEmailClassifier: [
    { key: 'categories', label: 'Target Categories (comma-separated)', placeholder: 'JOB,CERTIFICATE,OFFER', type: 'text' }
  ],
  aiDetailExtractor: [
    { key: 'targetFields', label: 'Fields to Extract (comma-separated)', placeholder: 'company,role,date,sender', type: 'text' }
  ],
  aiSummarizer: [
    { key: 'prompt', label: 'Summarization Instruction / Prompt', placeholder: 'Summarize key information for downstream actions', type: 'textarea' }
  ],
  webhookTrigger: [
    { key: 'path', label: 'Webhook Path', placeholder: '/webhook', type: 'text' }
  ],
  googleSheetsAppend: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', placeholder: 'Google Sheets spreadsheet ID', type: 'text' },
    { key: 'sheetName', label: 'Sheet / Tab Name', placeholder: 'Jobs', type: 'text' }
  ],
  slackPostMessage: [
    { key: 'channel', label: 'Slack Channel', placeholder: '#career-alerts', type: 'text' },
    { key: 'messageTemplate', label: 'Message Template', placeholder: 'New job found: {{company}} - {{role}}', type: 'textarea' }
  ],
  discordPostMessage: [
    { key: 'channelId', label: 'Discord Channel ID', placeholder: '1234567890', type: 'text' },
    { key: 'messageTemplate', label: 'Message Template', placeholder: '**New job:** {{company}}', type: 'textarea' }
  ],
  linkedinPost: [
    { key: 'requireApproval', label: 'Require Human Approval', placeholder: '', type: 'checkbox' }
  ],
  scheduleTrigger: [
    { key: 'cron', label: 'Cron Expression', placeholder: '0 9 * * 1 (every Monday 9am)', type: 'text' }
  ],
  conditionBranch: [
    { key: 'condition', label: 'Branch Condition', placeholder: 'category === "JOB"', type: 'text' }
  ],
  approvalGate: [
    { key: 'approvalMessage', label: 'Message to Approver', placeholder: 'Please review and approve this action', type: 'textarea' }
  ]
};

export default function NodeConfigPanel() {
  const { selectedNode, updateNodeConfig, setSelectedNode } = useWorkflowStore();

  if (!selectedNode) {
    return (
      <div className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <Settings className="w-8 h-8 text-slate-600 mb-3" />
        <p className="text-xs font-medium text-slate-500">Click a node on the canvas to configure it here.</p>
      </div>
    );
  }

  const nodeType = selectedNode.data?.nodeType || selectedNode.type;
  const Icon = nodeIconMap[nodeType] || Settings;
  const fields = configFieldsMap[nodeType] || [];
  const label = selectedNode.data?.label || nodeType;
  const currentConfig = selectedNode.config || {};

  const handleChange = (key, value) => {
    updateNodeConfig(selectedNode.id, { [key]: value });
  };

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-200 truncate">{label}</h3>
        </div>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-slate-500 hover:text-slate-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Config fields */}
      <div className="p-4 space-y-4 flex-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Node Configuration</p>

        {fields.length === 0 && (
          <p className="text-xs text-slate-500">No configurable options for this node type.</p>
        )}

        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                rows={3}
                value={currentConfig[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none transition"
              />
            ) : field.type === 'checkbox' ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!currentConfig[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-xs text-slate-400">Enabled</span>
              </label>
            ) : (
              <input
                type={field.type}
                value={currentConfig[field.key] || ''}
                onChange={(e) => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            )}
          </div>
        ))}

        {/* Node metadata */}
        <div className="mt-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <p className="text-[10px] text-slate-500 font-medium uppercase mb-1">Node ID</p>
          <code className="text-[10px] text-indigo-400 font-mono break-all">{selectedNode.id}</code>
        </div>
      </div>
    </div>
  );
}
