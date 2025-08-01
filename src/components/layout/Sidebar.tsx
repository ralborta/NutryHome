'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Phone,
  MessageSquare,
  Upload,
  Settings,
  BarChart3,
  HelpCircle,
  Menu,
  X,
  User,
  Bell,
  Search
} from 'lucide-react';

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
    title: 'Conversaciones',
    icon: MessageSquare,
    href: '/conversations',
    description: 'Historial de conversaciones'
  },
  {
    title: 'Carga de Llamadas',
    icon: Upload,
    href: '/upload',
    description: 'Subir llamadas manualmente'
  },
  {
    title: 'Configuración',
    icon: Settings,
    href: '/settings',
    description: 'Configurar sistema'
  },
  {
    title: 'Reportes',
    icon: BarChart3,
    href: '/reports',
    description: 'Generar reportes'
  },
  {
    title: 'Ayuda',
    icon: HelpCircle,
    href: '/help',
    description: 'Centro de ayuda'
  }
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className={`
          fixed lg:relative lg:translate-x-0 z-40
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-in-out
          w-70 lg:w-64 h-full bg-white border-r border-gray-200 shadow-lg
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NutryHome</h1>
              <p className="text-xs text-gray-500">Call Center</p>
            </div>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Administrador
              </p>
              <p className="text-xs text-gray-500 truncate">
                admin@nutryhome.com
              </p>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                <div className="flex-1">
                  <span className="text-sm font-medium">{item.title}</span>
                  {!isCollapsed && (
                    <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                      {item.description}
                    </p>
                  )}
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="w-1 h-8 bg-white rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              NutryHome v1.0.0
            </p>
            <p className="text-xs text-gray-400 mt-1">
              © 2024 Todos los derechos reservados
            </p>
          </div>
        </div>
      </motion.div>

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