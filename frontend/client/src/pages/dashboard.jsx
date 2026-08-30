import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../components/AppShell/AppShell';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import {
  Workflow,
  Activity,
  CheckCircle2,
  Cpu,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Loader2
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ workflows: 0, executions: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        const [wfRes, exRes] = await Promise.all([
          api.get('/workflows').catch(() => ({ data: { data: { workflows: [] } } })),
          api.get('/executions').catch(() => ({ data: { data: { executions: [] } } }))
        ]);
        setStats({
          workflows: wfRes.data?.data?.workflows?.length || 0,
          executions: exRes.data?.data?.executions?.length || 0
        });
      } catch (e) {}
    }
    loadStats();
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    router.push(`/workflows/builder?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 p-8">
            <div className="relative z-10 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Operator Dashboard
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">
                Welcome back, {user?.name || 'Operator'} 👋
              </h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                HYRO multi-agent engine is active. Create new workflows with natural language or monitor running automations below.
              </p>
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-500/10 hidden lg:block pointer-events-none">
              <Sparkles className="w-48 h-48" />
            </div>
          </div>

          {/* Quick Automation Prompt Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">Quick Automation Builder</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Describe your automation goal in plain language (e.g., "Monitor my Gmail for job emails and save them to Google Sheets").
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Whenever an invoice arrives in Gmail, save details to Sheets and alert Slack..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2 shrink-0 transition disabled:opacity-50"
              >
                Generate <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Total Workflows</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Workflow className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">0</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Ready for graph generation</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Total Executions</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">0</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Agentic execution runs</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Success Rate</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">100%</p>
              <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3" /> System optimal
              </span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Active Agents</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">5 / 5</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Planner, Exec, Valid, Rec, Mon</span>
            </div>
          </div>

          {/* Activity / Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Status Panel */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" /> Five-Agent Status Overview
                </h3>
                <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                  Ready
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Planner Agent', desc: 'Determines execution order & emitting confidence', status: 'Ready' },
                  { name: 'Execution Agent', desc: 'Executes workflow nodes via integration service', status: 'Ready' },
                  { name: 'Validation Agent', desc: 'Verifies required output fields and schema integrity', status: 'Ready' },
                  { name: 'Recovery Agent', desc: 'Handles API failure, Auth expiry & exponential backoff', status: 'Ready' },
                  { name: 'Monitoring Agent', desc: 'Streams Socket.IO live timeline events and audit logs', status: 'Ready' },
                ].map((agent) => (
                  <div key={agent.name} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{agent.name}</h4>
                      <p className="text-[11px] text-slate-400">{agent.desc}</p>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Executions Log Panel */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> System Log Stream
              </h3>
              <div className="text-center py-10 text-slate-500 text-xs">
                <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
                No executions recorded yet. Create and run a workflow to start live monitoring.
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
