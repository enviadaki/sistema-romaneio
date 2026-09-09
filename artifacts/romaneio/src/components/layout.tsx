import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ScanLine, History, FileText, LogOut, User,
  Search, Truck, ClipboardList, DollarSign, Users, Shield, QrCode, Settings,
  RotateCcw,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useOperation, OPERATIONS } from "@/contexts/operation-context";
import { useMotoristaAuth } from "@/contexts/motorista-auth-context";
import { useOperatorAuth } from "@/contexts/operator-auth-context";
import { isPageAllowed } from "@/lib/operator-pages";

const ALL_MOTORISTA_PATHS = ["/entrega"];

export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { user: motoristaUser, logout: motoristaLogout } = useMotoristaAuth();
  const { user: operatorUser, logout: operatorLogout } = useOperatorAuth();
  const { operation, setOperation } = useOperation();

  const isMotorista = motoristaUser !== null || (clerkUser?.publicMetadata?.role as string) === "motorista";
  const isCustomOperator = operatorUser !== null;

  const clerkRole = clerkUser?.publicMetadata?.role as string | undefined;
  const isAdmin = clerkRole === "admin" || clerkRole === "operator";

  const displayName =
    operatorUser?.fullName ||
    motoristaUser?.fullName ||
    clerkUser?.fullName ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    "Usuário";

  const userTag = operatorUser
    ? "operador"
    : motoristaUser
    ? "motorista"
    : clerkRole ?? undefined;

  // Allowed operations: operator users only see their allowed ones; everyone else sees all
  const allowedOps: readonly string[] =
    isCustomOperator && operatorUser!.allowedOperations.length > 0
      ? operatorUser!.allowedOperations
      : OPERATIONS;

  const handleSignOut = () => {
    if (motoristaUser) {
      motoristaLogout();
      navigate("/sign-in");
    } else if (operatorUser) {
      operatorLogout();
      navigate("/sign-in");
    } else {
      signOut();
    }
  };

  // Restrict motorista to their allowed paths
  useEffect(() => {
    if (isMotorista && !ALL_MOTORISTA_PATHS.some((p) => location === p)) {
      navigate("/entrega");
    }
  }, [isMotorista, location, navigate]);

  // If operator only has access to one operation, lock to it
  useEffect(() => {
    if (isCustomOperator && operatorUser!.allowedOperations.length === 1) {
      const only = operatorUser!.allowedOperations[0];
      if (only === "LOGGI" || only === "AMAZON") {
        setOperation(only);
      }
    }
  }, [isCustomOperator, operatorUser, setOperation]);

  const operatorAllowedPages = isCustomOperator ? (operatorUser!.allowedPages ?? []) : [];

  const allNavItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cadastro", label: "Cadastro", icon: Package },
    { href: "/pre-sorter", label: "Pré-Sorter", icon: ScanLine },
    { href: "/consulta", label: "Consulta", icon: Search },
    { href: "/entrega", label: "Checagem Entrega", icon: Truck },
    { href: "/historico", label: "Histórico", icon: History },
    { href: "/devolucoes", label: "Devoluções", icon: RotateCcw },
    { href: "/romaneio", label: "Romaneio", icon: FileText },
    { href: "/romaneio-motorista", label: "Romaneio Motorista", icon: ClipboardList },
    { href: "/financeiro", label: "Financeiro", icon: DollarSign },
    { href: "/qr-autoplay", label: "Auto QR", icon: QrCode },
    ...(isAdmin
      ? [
          { href: "/admin", label: "Administração", icon: Settings },
          { href: "/usuarios", label: "Usuários Motoristas", icon: Users },
        ]
      : []),
    ...(isCustomOperator && operatorUser!.canManageMotoristas
      ? [{ href: "/motoristas", label: "Cadastro de Motoristas", icon: Truck }]
      : []),
  ];

  const motoristaNavItems = [
    { href: "/entrega", label: "Checagem de Entrega", icon: Truck },
  ];

  // For custom operators, filter nav items to only allowed pages
  const filteredNavItems = isCustomOperator
    ? allNavItems.filter((item) => isPageAllowed(operatorAllowedPages, item.href))
    : allNavItems;

  const navItems = isMotorista ? motoristaNavItems : filteredNavItems;

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
        <div className="p-4 border-b border-sidebar-border flex items-center justify-center h-20">
          <img src={`${import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL}/enviadaki-logo.png`} alt="Envia Daki" className="h-10 w-auto" />
        </div>

        {/* Operation Selector — hidden for motoristas */}
        {!isMotorista && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/50 font-medium uppercase tracking-wider mb-2 px-1">Operação</p>
            <div className="flex gap-1.5">
              {OPERATIONS.filter((op) => allowedOps.includes(op)).map((op) => {
                const colors = operationColors[op];
                const isActive = operation === op;
                return (
                  <button
                    key={op}
                    onClick={() => setOperation(op)}
                    disabled={allowedOps.length === 1}
                    className={`flex-1 py-2 rounded-md text-sm font-bold tracking-wide transition-all ${
                      isActive ? colors.active + " shadow-sm" : colors.inactive
                    } disabled:cursor-default`}
                  >
                    {op}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
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
              {userTag && (
                <p className="text-xs text-sidebar-foreground/60 truncate">{userTag}</p>
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
