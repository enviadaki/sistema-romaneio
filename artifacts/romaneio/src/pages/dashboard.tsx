import {
  useGetStats,
  getGetStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ScanLine, MapPin, Trophy, User, Route } from "lucide-react";
import { formatDateTime } from "@/lib/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/lib/routes-data";
import { useMemo } from "react";

const MEDAL_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-700"];
const MEDAL_LABELS = ["🥇", "🥈", "🥉"];

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats({
    query: { queryKey: getGetStatsQueryKey() },
  });

  // Build route progress from static ROUTES config + stats data
  const routeProgress = useMemo(() => {
    if (!stats) return [];

    const pkgMap: Record<string, number> = {};
    for (const item of stats.packagesByCity) {
      pkgMap[item.city] = (pkgMap[item.city] ?? 0) + item.count;
    }

    const scanMap: Record<string, number> = {};
    for (const item of stats.scansByCity) {
      scanMap[item.city] = (scanMap[item.city] ?? 0) + item.count;
    }

    return ROUTES.map((route) => {
      let totalPkgs = 0;
      let totalScans = 0;
      for (const city of route.cities) {
        totalPkgs += pkgMap[city] ?? 0;
        totalScans += scanMap[city] ?? 0;
      }
      return { name: route.name, totalPkgs, totalScans };
    })
      .filter((r) => r.totalPkgs > 0)
      .sort((a, b) => {
        // Sort by: scanned first (has progress), then by name
        const aPct = a.totalPkgs > 0 ? a.totalScans / a.totalPkgs : 0;
        const bPct = b.totalPkgs > 0 ? b.totalScans / b.totalPkgs : 0;
        return bPct - aPct;
      });
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!stats) return null;

  const totalScansOperators = stats.scansByOperator.reduce(
    (acc, o) => acc + o.count,
    0,
  );

  const rotasCompletas = routeProgress.filter(
    (r) => r.totalPkgs > 0 && r.totalScans >= r.totalPkgs,
  ).length;
  const rotasComProgresso = routeProgress.filter(
    (r) => r.totalScans > 0 && r.totalScans < r.totalPkgs,
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral da operação de romaneios de hoje.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacotes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPackages}</div>
            <p className="text-xs text-muted-foreground mt-1">na base de dados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scans Hoje</CardTitle>
            <ScanLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScansToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.scansByOperator.length > 0
                ? `por ${stats.scansByOperator.length} operador${stats.scansByOperator.length > 1 ? "es" : ""}`
                : "nenhum operador ativo"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cidades Ativas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCities}</div>
            <p className="text-xs text-muted-foreground mt-1">com pacotes cadastrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Route Progress Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            <CardTitle>Progresso por Rota — Hoje</CardTitle>
          </div>
          <div className="flex gap-2">
            {rotasCompletas > 0 && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                ✓ {rotasCompletas} completa{rotasCompletas !== 1 ? "s" : ""}
              </Badge>
            )}
            {rotasComProgresso > 0 && (
              <Badge variant="secondary" className="text-xs">
                {rotasComProgresso} em andamento
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {routeProgress.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
              <Route className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma rota com pacotes cadastrados.</p>
              <p className="text-xs">Cadastre pacotes para ver o progresso por rota.</p>
            </div>
          ) : (
            <ScrollArea className="h-[380px] pr-2">
              <div className="space-y-3 pr-2">
                {routeProgress.map((route) => {
                  const pct =
                    route.totalPkgs > 0
                      ? Math.min(100, Math.round((route.totalScans / route.totalPkgs) * 100))
                      : 0;
                  const isComplete = route.totalScans >= route.totalPkgs;
                  const hasProgress = route.totalScans > 0;

                  return (
                    <div key={route.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-medium truncate flex-1 ${
                            isComplete ? "text-green-700" : ""
                          }`}
                        >
                          {isComplete && (
                            <span className="mr-1.5 text-green-600">✓</span>
                          )}
                          {route.name}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {route.totalScans}/{route.totalPkgs}
                          </span>
                          <span
                            className={`text-xs font-bold tabular-nums w-9 text-right ${
                              isComplete
                                ? "text-green-600"
                                : hasProgress
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete
                              ? "bg-green-500"
                              : hasProgress
                              ? "bg-primary"
                              : "bg-muted-foreground/20"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Operator Ranking */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>Ranking de Operadores — Hoje</CardTitle>
          </div>
          {stats.scansByOperator.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalScansOperators} bipagem{totalScansOperators !== 1 ? "s" : ""} no total
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {stats.scansByOperator.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
              <User className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma bipagem registrada hoje.</p>
              <p className="text-xs">O ranking será exibido assim que os operadores começarem a bipar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.scansByOperator.map((item, index) => {
                const pct = totalScansOperators > 0
                  ? Math.round((item.count / totalScansOperators) * 100)
                  : 0;
                const isTop = index < 3;
                return (
                  <div key={item.operator} className="flex items-center gap-3">
                    <div className="w-6 text-center flex-shrink-0">
                      {isTop ? (
                        <span className="text-base leading-none">{MEDAL_LABELS[index]}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">{index + 1}º</span>
                      )}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium truncate ${isTop ? MEDAL_COLORS[index] : ""}`}>
                          {item.operator}
                        </span>
                        <span className="text-sm font-bold ml-2 flex-shrink-0">
                          {item.count}
                          <span className="text-xs text-muted-foreground font-normal ml-1">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                              ? "bg-slate-400"
                              : index === 2
                              ? "bg-amber-700"
                              : "bg-primary/40"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom panels */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pacotes por Cidade</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.packagesByCity.map((item) => (
                  <TableRow key={item.city}>
                    <TableCell className="font-medium">{item.city}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                  </TableRow>
                ))}
                {stats.packagesByCity.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center py-4 text-muted-foreground"
                    >
                      Nenhum pacote registrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scans Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm font-mono truncate">
                      {scan.trackingNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">{scan.city}</p>
                    {scan.scannedBy && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" />
                        {scan.scannedBy}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-2 flex-shrink-0">
                    {formatDateTime(scan.scannedAt)}
                  </div>
                </div>
              ))}
              {stats.recentScans.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum scan recente.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
