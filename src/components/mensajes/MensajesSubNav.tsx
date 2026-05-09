'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HardDriveUpload, Layers, Inbox } from 'lucide-react';

const items: { href: string; label: string; description: string; icon: typeof Inbox }[] = [
  {
    href: '/mensajes/carga',
    label: 'Carga',
    description: 'Archivos y variables de campaña',
    icon: HardDriveUpload,
  },
  {
    href: '/mensajes/batches',
    label: 'Lotes y ejecución',
    description: 'Colas outbound / inbound',
    icon: Layers,
  },
  {
    href: '/mensajes/bandeja',
    label: 'Bandeja',
    description: 'Conversaciones y detalle',
    icon: Inbox,
  },
];

/** Submenú lateral del módulo Mensajes (misma línea visual que el sidebar global). */
export default function MensajesSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="rounded-[14px] border border-[#eef2f6] bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
      aria-label="Secciones de mensajes"
    >
      <p className="mb-2 px-2.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600/55">
        En este módulo
      </p>
      <ul className="space-y-1">
        {items.map(({ href, label, description, icon: Icon }) => {
          const isActive =
            href === '/mensajes/bandeja'
              ? pathname === href || pathname.startsWith('/mensajes/conversacion/')
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-start gap-3 rounded-[14px] px-3 py-3 text-left text-[13px] font-semibold tracking-tight transition-all ${
                  isActive
                    ? 'border border-sky-200/90 bg-gradient-to-r from-sky-50 via-blue-50/90 to-sky-50/80 text-[#1d4ed8] shadow-[0_2px_8px_rgba(37,99,235,0.08)]'
                    : 'border border-transparent bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-200 hover:bg-slate-50/80 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`mt-0.5 h-[18px] w-[18px] shrink-0 stroke-[1.75] ${
                    isActive ? 'text-[#2563eb]' : 'text-slate-400'
                  }`}
                />
                <span className="min-w-0">
                  <span className="block leading-tight">{label}</span>
                  <span
                    className={`mt-0.5 block text-[11px] font-medium leading-snug ${
                      isActive ? 'text-sky-800/80' : 'text-slate-400'
                    }`}
                  >
                    {description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
