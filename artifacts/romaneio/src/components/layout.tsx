import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ScanLine, History, FileText, LogOut, User, Search, Truck, ClipboardList, DollarSign, Users } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useOperation, OPERATIONS } from "@/contexts/operation-context";
import { useMotoristaAuth } from "@/contexts/motorista-auth-context";

const ALL_MOTORISTA_PATHS = ["/entrega"];

export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { user: motoristaUser, logout: motoristaLogout } = useMotoristaAuth();
  const { operation, setOperation } = useOperation();

  const isMotorista =
    motoristaUser !== null || (clerkUser?.publicMetadata?.role as string | undefined) === "motorista";

  const role = motoristaUser?.role ?? (clerkUser?.publicMetadata?.role as string | undefined);
  const isAdmin = role === "admin" || role === "operator";

  const displayName =
    motoristaUser?.fullName ||
    clerkUser?.fullName ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    "Usuário";

  const handleSignOut = () => {
    if (motoristaUser) {
      motoristaLogout();
      navigate("/sign-in");
    } else {
      signOut();
    }
  };

  useEffect(() => {
    if (isMotorista && !ALL_MOTORISTA_PATHS.some((p) => location === p)) {
      navigate("/romaneio");
    }
  }, [isMotorista, location, navigate]);

  const allNavItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cadastro", label: "Cadastro", icon: Package },
    { href: "/pre-sorter", label: "Pré-Sorter", icon: ScanLine },
    { href: "/consulta", label: "Consulta", icon: Search },
    { href: "/entrega", label: "Checagem Entrega", icon: Truck },
    { href: "/historico", label: "Histórico", icon: History },
    { href: "/romaneio", label: "Romaneio", icon: FileText },
    { href: "/romaneio-motorista", label: "Romaneio Motorista", icon: ClipboardList },
    { href: "/financeiro", label: "Financeiro", icon: DollarSign },
    ...(isAdmin ? [{ href: "/usuarios", label: "Usuários Motoristas", icon: Users }] : []),
  ];

  const motoristaNavItems = [
    { href: "/entrega", label: "Checagem de Entrega", icon: Truck },
  ];

  const navItems = isMotorista ? motoristaNavItems : allNavItems;

  const operationColors: Record<string, { active: string; inactive: string }> = {
    LOGGI: {
      active: "bg-blue-600 text-white",
      inactive: "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
    },
    AMAZON: {
      active: "bg-orange-500 text-white",
      inactive: "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
    },
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col flex-shrink-0 no-print">
        <div className="p-4 border-b border-sidebar-border flex items-center gap-2 font-bold text-lg">
          <Package className="h-6 w-6 text-sidebar-primary" />
          <span>Romaneios</span>
        </div>

        {/* Operation Selector */}
        <div className="px-3 py-3 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50 font-medium uppercase tracking-wider mb-2 px-1">Operação</p>
          <div className="flex gap-1.5">
            {OPERATIONS.map((op) => {
              const colors = operationColors[op];
              const isActive = operation === op;
              return (
                <button
                  key={op}
                  onClick={() => setOperation(op)}
                  className={`flex-1 py-2 rounded-md text-sm font-bold tracking-wide transition-all ${
                    isActive ? colors.active + " shadow-sm" : colors.inactive
                  }`}
                >
                  {op}
                </button>
              );
            })}
          </div>
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

        {/* User info + logout */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex-shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              {motoristaUser && (
                <p className="text-xs text-sidebar-foreground/60 truncate">motorista</p>
              )}
              {!motoristaUser && clerkUser?.primaryEmailAddress && clerkUser?.fullName && (
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {clerkUser.primaryEmailAddress.emailAddress}
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex-shrink-0 p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
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
