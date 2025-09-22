'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Phone,
  Upload,
  Settings,
  BarChart3,
  HelpCircle,
  Menu,
  X,
  User,
  Bell,
  Search,
  LogOut
} from 'lucide-react';

// Icono de WhatsApp (SVG inline) para el menú
function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.1-.472-.149-.672.15-.197.297-.769.966-.941 1.166-.173.199-.347.224-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.173.198-.297.298-.496.099-.198.05-.372-.025-.521-.075-.149-.672-1.62-.92-2.22-.242-.58-.487-.501-.672-.51-.173-.009-.372-.011-.571-.011-.199 0-.521.074-.793.372-.273.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.006-1.41.248-.69.248-1.282.173-1.41-.074-.128-.272-.198-.57-.347zM12.002 2c5.514 0 9.998 4.486 9.998 10 0 5.515-4.484 10-9.998 10-1.76 0-3.405-.455-4.833-1.249L2 22l1.272-5.045C2.455 15.526 2 13.86 2 12c0-5.514 4.486-10 10.002-10z"/>
    </svg>
  );
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
    description: 'Vista general del call center'
  },
  {
    title: 'Gestión de Llamadas',
    icon: Phone,
    href: '/calls',
    description: 'Administrar llamadas'
  },
  {
    title: 'Mensajes',
    icon: WhatsAppIcon,
    href: '/conversations',
    description: 'Historial de mensajes'
  },
  {
    title: 'Carga de Llamadas',
    icon: Upload,
    href: '/upload',
    description: 'Subir llamadas manualmente'
  },
  {
    title: 'Llamadas NutriHome',
    icon: BarChart3,
    href: '/estadisticas-isabela',
    description: 'Llamadas NutriHome'
  }
];

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada correctamente');
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:relative lg:translate-x-0 z-40
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out
        w-70 lg:w-64 h-full bg-white border-r border-gray-200 shadow-xl
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NutriHome</h1>
              <p className="text-xs text-gray-600 font-medium">Call Center</p>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                Administrador
              </p>
              <p className="text-xs text-gray-500 truncate">
                admin@nutryhome.com
              </p>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto bg-white">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon as any;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-md'
                  }
                `}
              >
                <div className={`
                  p-2 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-white bg-opacity-20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                  }
                `}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold">{item.title}</span>
                  <p className={`text-xs mt-1 ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:shadow-md"
          >
            <div className="p-2 rounded-lg transition-colors bg-gray-100 group-hover:bg-red-100">
              <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-semibold">Cerrar Sesión</span>
              <p className="text-xs mt-1 text-gray-500 group-hover:text-red-500">
                Salir del sistema
              </p>
            </div>
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-600 font-medium">
              NutriHome v3.5.1
            </p>
            <p className="text-xs text-gray-400 mt-1">
              © 2025 IAsolutions - Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
} 