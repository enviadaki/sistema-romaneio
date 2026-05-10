import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ScanLine, History, FileText } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cadastro", label: "Cadastro", icon: Package },
    { href: "/pre-sorter", label: "Pré-Sorter", icon: ScanLine },
    { href: "/historico", label: "Histórico", icon: History },
    { href: "/romaneio", label: "Romaneio", icon: FileText },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col flex-shrink-0 no-print">
        <div className="p-4 border-b border-sidebar-border flex items-center gap-2 font-bold text-lg">
          <Package className="h-6 w-6 text-sidebar-primary" />
          <span>Sistema de Romaneios</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
