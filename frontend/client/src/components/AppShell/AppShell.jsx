import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Workflow,
  MessageSquare,
  BookOpen,
  Boxes,
  Linkedin,
  Activity,
  Bell,
  Bot,
  LogOut,
  UserCheck
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'RAG Assistant', href: '/chat', icon: MessageSquare },
  { name: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
  { name: 'Integrations', href: '/integrations', icon: Boxes },
  { name: 'LinkedIn', href: '/linkedin', icon: Linkedin },
  { name: 'Executions', href: '/executions', icon: Activity },
  { name: 'Notifications', href: '/notifications', icon: Bell },
];

export default function AppShell({ children }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex">
        <div>
          {/* Logo Branding */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider text-white">HYRO</span>
              <span className="text-xs block text-indigo-400 font-semibold uppercase -mt-1">Automation</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Operator'}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-medium capitalize">
                  <UserCheck className="w-3 h-3" /> {user?.role || 'operator'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/60 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-200">
              {navigationItems.find((n) => n.href === router.pathname)?.name || 'HYRO Platform'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* System Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              HYRO Engine Active
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500"></span>
            </button>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
