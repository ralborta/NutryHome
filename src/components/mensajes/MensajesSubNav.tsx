'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HardDriveUpload, Layers, Inbox } from 'lucide-react';

const tabs: { href: string; label: string; icon: typeof Inbox }[] = [
  { href: '/mensajes/carga', label: 'Carga', icon: HardDriveUpload },
  { href: '/mensajes/batches', label: 'Lotes y ejecución', icon: Layers },
  { href: '/mensajes/bandeja', label: 'Bandeja', icon: Inbox },
];

export default function MensajesSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[#e8ecf1] bg-white/80 px-6 pb-0 pt-1"
      aria-label="Secciones de mensajes"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === '/mensajes/bandeja'
            ? pathname === href || pathname.startsWith('/mensajes/conversacion/')
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-[#2563eb] text-[#1d4ed8]'
                : 'border-transparent text-slate-600 hover:border-slate-200 hover:text-slate-900'
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#2563eb]' : 'text-slate-400'}`} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
