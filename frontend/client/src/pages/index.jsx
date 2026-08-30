import Link from 'next/link';
import { Sparkles, Workflow, ArrowRight, ShieldCheck, Zap, Layers, Database } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navbar */}
      <header className="h-20 border-b border-slate-800/80 px-8 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/hyro-logo.png"
            alt="Hyro Automation Logo"
            className="h-10 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:opacity-90 shadow-lg shadow-indigo-500/25 transition"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-16 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Hybrid Robotics Orchestration Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight mb-6">
          AI-Powered <span className="gradient-text">Agentic Workflow</span> Automation
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Describe what you want to automate in natural language. HYRO’s multi-agent orchestrator builds, validates, executes, and recovers visual digital workflows in real time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            href="/register"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-base shadow-xl shadow-indigo-500/30 hover:opacity-95 flex items-center gap-2 transition"
          >
            Start Automating <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-base hover:bg-slate-800 transition"
          >
            Operator Login
          </Link>
        </div>

        {/* Feature Grid Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left">
          <div className="glass-card p-6 rounded-2xl border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Workflow className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Visual Workflow Builder</h3>
            <p className="text-sm text-slate-400">
              Drag and drop nodes powered by React Flow. Automatically generate full graph pipelines from natural language prompts.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Five-Agent Orchestration</h3>
            <p className="text-sm text-slate-400">
              Cooperating Planner, Execution, Validation, Recovery, and Monitoring agents ensure reliable execution and recovery.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">RAG Knowledge Assistant</h3>
            <p className="text-sm text-slate-400">
              Upload PDF, Markdown, and text docs. Query your knowledge base with strict factual grounding and source references.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        HYRO Automation &copy; 2026 — Hybrid Robotics Orchestration Platform
      </footer>
    </div>
  );
}
