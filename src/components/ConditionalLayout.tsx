'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/authStore';
import LoginForm from '@/components/LoginForm';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Mostrar loading mientras se hidrata
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-4 animate-pulse">
            <div className="w-10 h-10 bg-white rounded-lg"></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NutriHome</h1>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
