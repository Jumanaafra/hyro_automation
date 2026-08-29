import { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../components/AppShell/AppShell';
import api from '../services/api';
import {
  Plug, CheckCircle2, AlertCircle, RefreshCw, ExternalLink,
  Mail, Sheet, Slack, MessageSquare, Linkedin, Cpu, Lock
} from 'lucide-react';

const PROVIDER_META = {
  gmail: { label: 'Gmail', icon: Mail, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', scopes: ['gmail.readonly', 'gmail.send'] },
  'google-sheets': { label: 'Google Sheets', icon: Sheet, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', scopes: ['spreadsheets'] },
  slack: { label: 'Slack', icon: Slack, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', scopes: ['chat:write'] },
  discord: { label: 'Discord', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', scopes: ['bot'] },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', scopes: ['w_member_social'] }
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/integrations');
      setIntegrations(res.data.data.integrations || []);
    } catch (err) {}
    setLoading(false);
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const handleConnect = async (provider) => {
    try {
      const res = await api.get(`/integrations/oauth/${provider}/start`);
      const { authUrl } = res.data.data;
      // In dev, simulate immediate connection via mock callback
      const cbRes = await api.get(`/integrations/oauth/${provider}/callback?code=mock_code_${Date.now()}`);
      setActionMsg(`✅ ${PROVIDER_META[provider]?.label || provider} connected successfully`);
      setTimeout(() => setActionMsg(''), 3000);
      fetchIntegrations();
    } catch (err) {
      setActionMsg(`❌ Failed to connect: ${err.response?.data?.message || err.message}`);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plug className="w-5 h-5 text-indigo-400" /> Integrations Hub
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">Connect external services to power your automated workflows</p>
            </div>
            <button
              onClick={fetchIntegrations}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
            <Lock className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400">
              All OAuth credentials are encrypted at rest using <span className="text-indigo-400 font-semibold">AES-256-CBC</span> server-side encryption. Tokens are never exposed to the browser or logged anywhere in the system.
            </p>
          </div>

          {actionMsg && (
            <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/20 text-sm text-slate-200">{actionMsg}</div>
          )}

          {/* Integration Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(PROVIDER_META).map(([provider, meta]) => {
                const integration = integrations.find((i) => i.provider === provider);
                const isConnected = integration?.isConnected;
                const Icon = meta.icon;

                return (
                  <div
                    key={provider}
                    className={`glass-card p-5 rounded-2xl border transition ${isConnected ? 'border-emerald-500/20' : 'border-slate-800'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg} border ${meta.border}`}>
                          <Icon className={`w-5 h-5 ${meta.color}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{meta.label}</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Scopes: {meta.scopes.join(', ')}
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        isConnected
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {isConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                      </span>
                    </div>

                    {isConnected && integration?.expiresAt && (
                      <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Token valid until {new Date(integration.expiresAt).toLocaleString()}
                      </p>
                    )}

                    <div className="mt-4">
                      <button
                        onClick={() => handleConnect(provider)}
                        className={`w-full py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
                          isConnected
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            : `${meta.bg} ${meta.color} border ${meta.border} hover:opacity-90`
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {isConnected ? `Reconnect ${meta.label}` : `Connect ${meta.label}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
