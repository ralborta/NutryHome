'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  Home,
  Heart,
  Phone,
  Upload,
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
  Users,
  ClipboardList,
  FileBarChart,
  LineChart,
  MessageSquare,
  Settings,
  FolderKanban,
} from 'lucide-react';

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** activo también en subrutas (ej. /calls/campanas) */
  activeMatch?: 'prefix';
};

function BrandLogoMark({ className }: { className?: string }) {
  return (
    <div
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 text-white shadow-md shadow-purple-900/18 ${className ?? ''}`}
      aria-hidden
    >
      <Home className="relative z-0 h-[19px] w-[19px]" strokeWidth={1.85} />
      <Heart className="absolute left-1/2 top-[54%] z-10 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 fill-white text-white opacity-95" strokeWidth={0} />
    </div>
  );
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operación',
    items: [
      { title: 'Dashboard', href: '/', icon: Home },
      { title: 'Gestión de Llamadas', href: '/calls', icon: Phone },
      { title: 'Campañas y lotes', href: '/calls/campanas', icon: FolderKanban, activeMatch: 'prefix' },
      { title: 'Mensajes', href: '/calls', icon: MessageSquare },
      { title: 'Carga de Llamadas', href: '/upload', icon: Upload },
    ],
  },
  {
    label: 'Pacientes',
    items: [
      { title: 'Pacientes', href: '/calls', icon: Users },
      { title: 'Seguimiento', href: '/estadisticas-isabela', icon: ClipboardList },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { title: 'Reportes', href: '/reportes/productos', icon: FileBarChart },
      { title: 'Analytics', href: '/estadisticas-isabela', icon: LineChart },
    ],
  },
];

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada correctamente');
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive =
      item.activeMatch === 'prefix'
        ? pathname === item.href || pathname.startsWith(`${item.href}/`)
        : pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-[13px] font-semibold tracking-tight transition-all ${
          isActive
            ? 'border border-sky-200/90 bg-gradient-to-r from-sky-50 via-blue-50/90 to-sky-50/80 text-[#1d4ed8] shadow-[0_2px_8px_rgba(37,99,235,0.08)]'
            : 'border border-[#eceff3] bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-200 hover:bg-slate-50/80 hover:text-slate-900'
        }`}
      >
        <Icon
          className={`h-[18px] w-[18px] shrink-0 stroke-[1.75] ${isActive ? 'text-[#2563eb]' : 'text-slate-400'}`}
        />
        <span>{item.title}</span>
      </Link>
    );
  };

  const systemItemClass =
    'flex w-full items-center gap-3 rounded-[14px] border border-[#eceff3] bg-white px-3.5 py-3 text-left text-[13px] font-semibold tracking-tight text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-200 hover:bg-slate-50/80 hover:text-slate-900';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm lg:hidden"
        aria-label="Menú"
      >
        {isMobileOpen ? <X className="h-5 w-5 text-slate-700" /> : <Menu className="h-5 w-5 text-slate-700" />}
      </button>

      <aside
        className={`
        fixed left-0 top-0 z-40 flex h-screen min-h-0 w-[272px] flex-col overflow-hidden border-r border-[#e8ecf1] bg-[#f8fafc] shadow-[4px_0_24px_rgba(15,23,42,0.04)] transition-transform duration-300
        lg:sticky lg:h-screen lg:shrink-0 lg:translate-x-0 lg:shadow-[2px_0_14px_rgba(15,23,42,0.03)]
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        {/* Marca + campana — mockup: logo casa+corazón, NutriHome + Call Center; perfil aparte */}
        <div className="border-b border-[#eceff3] px-4 pb-4 pt-[18px]">
          <div className="flex items-start gap-2.5">
            <BrandLogoMark />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[15px] font-bold leading-none tracking-tight text-[#0f172a] lg:text-[16px]">NutriHome</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Call Center</p>
            </div>
            <button
              type="button"
              className="relative mt-px shrink-0 rounded-xl border border-[#eef2f6] bg-white p-2.5 text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label="Notificaciones"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
          </div>

          <div className="mt-4 rounded-[14px] border border-[#eef2f6] bg-white p-3 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-700 text-sm font-bold text-white shadow-sm">
                A
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0f172a]">Administrador</p>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <span className="truncate">admin@nutryhome.com</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {groups.map((g, gi) => (
              <div key={g.label} className={gi > 0 ? 'mt-5 border-t border-slate-100 pt-6' : ''}>
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600/55">
                  {g.label}
                </p>
                <div className="space-y-1.5">{g.items.map((item) => <NavLink key={item.href + item.title} item={item} />)}</div>
              </div>
            ))}
          </nav>
          <div className="shrink-0 border-t border-[#eef2f6] px-3 py-4">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600/55">Sistema</p>
            <div className="space-y-1.5">
              <button
                type="button"
                className={systemItemClass}
                onClick={() => toast('Configuración disponible próximamente.', { icon: '⚙️' })}
              >
                <Settings className="h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={1.75} />
                Configuración
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={`${systemItemClass} hover:border-red-100 hover:bg-red-50/80 hover:text-red-700`}
              >
                <LogOut className="h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={1.75} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#eceff3] px-4 py-4 text-center">
          <p className="text-[12px] font-semibold text-slate-600">NutriHome v3.5.1</p>
          <p className="mt-1.5 text-[11px] text-slate-400">© 2026 | IA Solutions</p>
          <p className="mt-1 text-[10px] leading-snug text-slate-400/90">Todos los derechos reservados</p>
        </div>
      </aside>

      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
