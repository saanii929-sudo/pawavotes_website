"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, Building2, LogOut, Menu, X, DollarSign, CreditCard } from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Don't apply layout to login page
  const isLoginPage = pathname === "/superadmin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/superadmin/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "superadmin") {
      router.push("/dashboard");
      return;
    }

    setUser(parsedUser);
    setLoading(false);
  }, [router, isLoginPage, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/superadmin/login");
  };

  // Render login page without layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loading or nothing while checking auth
  if (loading || !user) {
    return null;
  }

  const menu = [
    { name: "Dashboard", href: "/superadmin", icon: LayoutGrid },
    { name: "Organizations", href: "/superadmin/organizations", icon: Building2 },
    { name: "Withdrawals", href: "/superadmin/withdrawals", icon: CreditCard },
    { name: "Platform Revenue", href: "/superadmin/platform-revenue", icon: DollarSign },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="Pawavotes"
                width={50}
                height={50}
              />
              <span className="text-lg font-semibold text-green-600">
                SuperAdmin
              </span>
            </div>
            <button
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-green-50 hover:text-green-600 transition"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64" style={{ backgroundColor: '#f9fafb' }}>
        <header className="h-16 bg-white px-4 md:px-8 flex items-center justify-between" style={{ backgroundColor: '#ffffff' }}>
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-400">Super Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
