import { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, useClerk, useAuth } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { OperationProvider } from "@/contexts/operation-context";
import { MotoristaAuthProvider, useMotoristaAuth } from "@/contexts/motorista-auth-context";
import { OperatorAuthProvider, useOperatorAuth } from "@/contexts/operator-auth-context";

import Dashboard from "@/pages/dashboard";
import Cadastro from "@/pages/cadastro";
import PreSorter from "@/pages/pre-sorter";
import Historico from "@/pages/historico";
import Romaneio from "@/pages/romaneio";
import Consulta from "@/pages/consulta";
import Entrega from "@/pages/entrega";
import RomaneioMotorista from "@/pages/romaneio-motorista";
import Financeiro from "@/pages/financeiro";
import MotoristaUsuarios from "@/pages/motorista-usuarios";
import OperatorUsuarios from "@/pages/operator-usuarios";
import QrAutoplay from "@/pages/qr-autoplay";
import Admin from "@/pages/admin";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY não encontrado");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#1e3a5f",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#dc2626",
    colorBackground: "#f8fafc",
    colorInput: "#ffffff",
    colorInputForeground: "#0f172a",
    colorNeutral: "#94a3b8",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-bold text-xl",
    headerSubtitle: "text-slate-500 text-sm",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 text-sm font-medium",
    footerActionLink: "text-blue-700 font-medium hover:underline",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400 text-sm",
    identityPreviewEditButton: "text-blue-700",
    formFieldSuccessText: "text-green-600",
    alertText: "text-slate-700",
    logoBox: "mb-1",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-slate-200 bg-white hover:bg-slate-50",
    formButtonPrimary: "bg-[#1e3a5f] hover:bg-[#162e4d] text-white font-semibold",
    formFieldInput: "border-slate-200 bg-white text-slate-900",
    footerAction: "bg-slate-50 border-t border-slate-100",
    dividerLine: "bg-slate-200",
    alert: "border-red-100 bg-red-50",
    otpCodeFieldInput: "border-slate-300 bg-white text-slate-900",
    formFieldRow: "gap-3",
    main: "gap-4",
  },
};

function CustomLoginForm({
  title,
  subtitle,
  endpoint,
  onSuccess,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  onSuccess: (data: any) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Usuário ou senha inválidos");
        return;
      }
      onSuccess(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-1">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor={`${endpoint}-username`}>
              Usuário
            </label>
            <input
              id={`${endpoint}-username`}
              type="text"
              autoComplete="username"
              placeholder="ex: joaosilva"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor={`${endpoint}-password`}>
              Senha
            </label>
            <input
              id={`${endpoint}-password`}
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full rounded-md bg-[#1e3a5f] hover:bg-[#162e4d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 text-sm transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MotoristaLoginForm() {
  const { login } = useMotoristaAuth();
  const [, navigate] = useLocation();
  return (
    <CustomLoginForm
      title="Acesso do Motorista"
      subtitle="Entre com seu nome de usuário e senha"
      endpoint="/api/motorista/login"
      onSuccess={(data) => { login(data.token); navigate("/entrega"); }}
    />
  );
}

function OperatorLoginForm() {
  const { login } = useOperatorAuth();
  const [, navigate] = useLocation();
  return (
    <CustomLoginForm
      title="Acesso do Operador"
      subtitle="Entre com seu nome de usuário e senha"
      endpoint="/api/operator/login"
      onSuccess={(data) => { login(data.token); navigate("/"); }}
    />
  );
}

function SignInPage() {
  const [mode, setMode] = useState<"operador" | "motorista" | "admin">("operador");

  const tabs: { key: typeof mode; label: string }[] = [
    { key: "operador", label: "Operador" },
    { key: "motorista", label: "Motorista" },
    { key: "admin", label: "Admin" },
  ];

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-900 via-[#0f2850] to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src={`${basePath}/logo.svg`}
            alt="Logo"
            className="mx-auto mb-4 h-14 w-14"
          />
          <h1 className="text-2xl font-bold text-white">Sistema de Romaneios</h1>
          <p className="mt-1 text-sm text-slate-400">Gestão logística de entregas</p>
        </div>

        <div className="flex bg-white/10 backdrop-blur-sm rounded-xl mb-5 p-1 gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === t.key
                  ? "bg-white text-slate-900 shadow"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "operador" && <OperatorLoginForm />}
        {mode === "motorista" && <MotoristaLoginForm />}
        {mode === "admin" && (
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            appearance={clerkAppearance}
          />
        )}
      </div>
    </div>
  );
}


function ProtectedApp() {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { isAuthenticated: isMotoristaAuth } = useMotoristaAuth();
  const { isAuthenticated: isOperatorAuth } = useOperatorAuth();

  if (!clerkLoaded) return null;

  if (isSignedIn || isMotoristaAuth || isOperatorAuth) {
    return (
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/cadastro" component={Cadastro} />
          <Route path="/pre-sorter" component={PreSorter} />
          <Route path="/consulta" component={Consulta} />
          <Route path="/entrega" component={Entrega} />
          <Route path="/historico" component={Historico} />
          <Route path="/romaneio" component={Romaneio} />
          <Route path="/romaneio-motorista" component={RomaneioMotorista} />
          <Route path="/financeiro" component={Financeiro} />
          <Route path="/usuarios" component={MotoristaUsuarios} />
          <Route path="/operadores" component={OperatorUsuarios} />
          <Route path="/qr-autoplay" component={QrAutoplay} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    );
  }

  return <Redirect to="/sign-in" />;
}

function AppInner() {
  const { getToken } = useAuth();
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return (
    <MotoristaAuthProvider>
      <OperatorAuthProvider clerkGetToken={getToken}>
        <Switch>
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={() => <Redirect to="/sign-in" />} />
          <Route path="/*?" component={ProtectedApp} />
        </Switch>
        <Toaster />
      </OperatorAuthProvider>
    </MotoristaAuthProvider>
  );
}

function AppRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      localization={{
        signIn: {
          start: {
            title: "Bem-vindo de volta",
            subtitle: "Faça login para acessar o sistema",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppInner />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <WouterRouter base={basePath}>
      <OperationProvider>
        <AppRoutes />
      </OperationProvider>
    </WouterRouter>
  );
}

export default App;
