import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

// Import pages
import Dashboard from "@/pages/dashboard";
import Cadastro from "@/pages/cadastro";
import PreSorter from "@/pages/pre-sorter";
import Historico from "@/pages/historico";
import Romaneio from "@/pages/romaneio";


function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/cadastro" component={Cadastro} />
        <Route path="/pre-sorter" component={PreSorter} />
        <Route path="/historico" component={Historico} />
        <Route path="/romaneio" component={Romaneio} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;