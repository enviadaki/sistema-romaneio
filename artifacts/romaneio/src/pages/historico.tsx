import { useState, useMemo } from "react";
import {
  useListScans,
  getListScansQueryKey,
  useDeleteScan,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateTime, getTodayDateString } from "@/lib/date-utils";
import { useOperation } from "@/contexts/operation-context";
import { ROUTES } from "@/lib/routes-data";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, User } from "lucide-react";

type DateMode = "day" | "period";

export default function Historico() {
  const queryClient = useQueryClient();
  const { operation } = useOperation();
  const [routeFilter, setRouteFilter] = useState<string>("ALL");
  const [dateMode, setDateMode] = useState<DateMode>("day");
  const [dateFilter, setDateFilter] = useState<string>(getTodayDateString());
  const [dateFromFilter, setDateFromFilter] = useState<string>(getTodayDateString());
  const [dateToFilter, setDateToFilter] = useState<string>(getTodayDateString());
  const [operatorFilter, setOperatorFilter] = useState<string>("ALL");

  const selectedRoute = ROUTES.find((r) => r.name === routeFilter);

  const params: Record<string, string> = {};
  if (selectedRoute) params.cities = selectedRoute.cities.join(",");
  if (dateMode === "day") {
    if (dateFilter) params.date = dateFilter;
  } else {
    if (dateFromFilter) params.dateFrom = dateFromFilter;
    if (dateToFilter) params.dateTo = dateToFilter;
  }
  params.operation = operation;

  const { data: allScans, isLoading } = useListScans(params, {
    query: { queryKey: getListScansQueryKey(params) },
  });

  const deleteScan = useDeleteScan();

  const operators = useMemo(() => {
    if (!allScans) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const scan of allScans) {
      const op = scan.scannedBy ?? "Sem identificação";
      if (!seen.has(op)) {
        seen.add(op);
        result.push(op);
      }
    }
    return result.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allScans]);

  const scans = useMemo(() => {
    if (!allScans) return [];
    if (operatorFilter === "ALL") return allScans;
    return allScans.filter((s) => {
      const op = s.scannedBy ?? "Sem identificação";
      return op === operatorFilter;
    });
  }, [allScans, operatorFilter]);

  const handleDelete = (id: number) => {
    deleteScan.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
        },
      }
    );
  };

  const hasActiveFilters =
    routeFilter !== "ALL" ||
    operatorFilter !== "ALL" ||
    (dateMode === "day" && dateFilter !== "") ||
    (dateMode === "period" && (dateFromFilter !== "" || dateToFilter !== ""));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Scans</h1>
        <p className="text-muted-foreground mt-2">
          Visualize e gerencie todos os registros de bipagem.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-[260px]">
          <label className="text-xs text-muted-foreground mb-1 block">Rota</label>
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as Rotas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Rotas</SelectItem>
              {ROUTES.map((r) => (
                <SelectItem key={r.name} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="text-xs text-muted-foreground mb-1 block">Data</label>
          <div className="flex gap-1 items-center">
            <div className="flex rounded-md border overflow-hidden text-xs h-9 shrink-0">
              <button
                className={`px-3 transition-colors ${dateMode === "day" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"}`}
                onClick={() => setDateMode("day")}
                type="button"
              >
                Dia
              </button>
              <button
                className={`px-3 border-l transition-colors ${dateMode === "period" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"}`}
                onClick={() => setDateMode("period")}
                type="button"
              >
                Período
              </button>
            </div>
            {dateMode === "day" ? (
              <Input
                type="date"
                className="w-[160px]"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  className="w-[145px]"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
                <span className="text-muted-foreground text-xs px-0.5">até</span>
                <Input
                  type="date"
                  className="w-[145px]"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="w-full sm:w-[220px]">
          <label className="text-xs text-muted-foreground mb-1 block">Operador</label>
          <Select value={operatorFilter} onValueChange={setOperatorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os Operadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Operadores</SelectItem>
              {operators.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setRouteFilter("ALL");
                setDateFilter("");
                setDateFromFilter("");
                setDateToFilter("");
                setOperatorFilter("ALL");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>

      {operatorFilter !== "ALL" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>
            Filtrando por operador:{" "}
            <Badge variant="secondary" className="ml-1">
              {operatorFilter}
            </Badge>
          </span>
          <span className="ml-auto font-medium text-foreground">
            {scans.length} {scans.length === 1 ? "registro" : "registros"}
          </span>
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Rastreador</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando histórico...
                </TableCell>
              </TableRow>
            ) : scans.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhum scan encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              scans.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(scan.scannedAt)}
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {scan.trackingNumber}
                  </TableCell>
                  <TableCell>{scan.city}</TableCell>
                  <TableCell>
                    {scan.scannedBy ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                          <User className="h-3 w-3" />
                        </span>
                        {scan.scannedBy}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(scan.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
