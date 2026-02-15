"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar1 from '@/components/sidebar1';
import Topbar1 from '@/components/topbar1';
import { UIProvider } from '@/context/ui-context';
import { 
  LayoutGrid, 
  Vote, 
  Users, 
  UserCheck, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import ChatbotWidget from '@/components/chatbot-widget';

export default function ElectionDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      if (parsedUser.role !== 'organization' || parsedUser.eventType !== 'election') {
        if (parsedUser.role === 'superadmin') {
          router.push('/superadmin');
        } else if (parsedUser.role === 'organization' && parsedUser.eventType === 'awards') {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
        return;
      }

      setUser(parsedUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // or a fallback UI
  }

  return (
      <UIProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#363636',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#16a34a',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc2626',
                secondary: '#fff',
              },
            },
          }}
        />
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar1 />
          <div className="flex-1 flex flex-col">
            <Topbar1 />
            <main className="p-4 md:px-24">{children}</main>
          </div>
        </div>
        {/* Chatbot Widget */}
        <ChatbotWidget />
      </UIProvider>
  );
}
