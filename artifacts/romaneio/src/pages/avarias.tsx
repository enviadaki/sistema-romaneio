import { useMemo, useState } from "react";
import { useOperation } from "@/contexts/operation-context";
import { OperationBadge } from "@/components/operation-badge";
import { formatDateTime, getTodayDateString } from "@/lib/date-utils";
import {
  useAvariasHistorico,
  useAvariaDetail,
  AVARIA_CATEGORIES,
  type AvariaListItem,
} from "@/hooks/use-avarias";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Image as ImageIcon, TriangleAlert } from "lucide-react";

// Passo 7 do plano da AMAZON: histórico/consulta de avarias — tela só de
// leitura em cima do que o Passo 6 já criou. Filtros combinados: período,
// código, usuário (responsável), sessão, situação — mesmo espírito do
// Histórico de Scans já existente, pra manter familiaridade de uso.

type DateMode = "day" | "period";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  AVARIA_CATEGORIES.map((c) => [c.value, c.label]),
);

function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

function statusLabel(value: string): string {
  if (value === "registrada") return "Registrada";
  return value;
}

export default function Avarias() {
  const { operation } = useOperation();
  const [dateMode, setDateMode] = useState<DateMode>("day");
  const [dateFilter, setDateFilter] = useState<string>(getTodayDateString());
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [trackingFilter, setTrackingFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [registeredByFilter, setRegisteredByFilter] = useState<string>("ALL");
  const [detailId, setDetailId] = useState<number | null>(null);

  const sessionIdNum = sessionFilter.trim() ? parseInt(sessionFilter.trim(), 10) : undefined;

  const { data: allAvarias, isLoading } = useAvariasHistorico({
    operation,
    trackingNumber: trackingFilter.trim() || undefined,
    sessionId: Number.isNaN(sessionIdNum) ? undefined : sessionIdNum,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    dateFrom: dateMode === "day" ? dateFilter || undefined : dateFromFilter || undefined,
    dateTo: dateMode === "day" ? dateFilter || undefined : dateToFilter || undefined,
  });

  // "Usuário" (responsável) é filtrado no cliente, igual ao Histórico de
  // Scans — o dropdown é montado a partir do que já veio filtrado pelos
  // outros campos.
  const registeredByOptions = useMemo(() => {
    if (!allAvarias) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const a of allAvarias) {
      const who = a.registeredBy ?? "Sem identificação";
      if (!seen.has(who)) {
        seen.add(who);
        result.push(who);
      }
    }
    return result.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allAvarias]);

  const avarias = useMemo(() => {
    if (!allAvarias) return [];
    if (registeredByFilter === "ALL") return allAvarias;
    return allAvarias.filter((a) => (a.registeredBy ?? "Sem identificação") === registeredByFilter);
  }, [allAvarias, registeredByFilter]);

  const statusOptions = useMemo(() => {
    if (!allAvarias) return [];
    const seen = new Set<string>();
    for (const a of allAvarias) seen.add(a.status);
    return Array.from(seen);
  }, [allAvarias]);

  const hasActiveFilters =
    trackingFilter !== "" ||
    sessionFilter !== "" ||
    statusFilter !== "ALL" ||
    registeredByFilter !== "ALL" ||
    (dateMode === "day" && dateFilter !== "") ||
    (dateMode === "period" && (dateFromFilter !== "" || dateToFilter !== ""));

  const { data: detail } = useAvariaDetail(detailId, operation);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Avarias</h1>
          <p className="text-muted-foreground mt-2">
            Consulte todos os objetos avariados registrados, com os detalhes de cada um.
          </p>
        </div>
        <OperationBadge operation={operation} className="mt-1" />
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-[220px]">
          <label className="text-xs text-muted-foreground mb-1 block">Código de rastreio</label>
          <Input
            placeholder="Buscar por código..."
            className="font-mono"
            value={trackingFilter}
            onChange={(e) => setTrackingFilter(e.target.value)}
          />
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
          <label className="text-xs text-muted-foreground mb-1 block">Responsável</label>
          <Select value={registeredByFilter} onValueChange={setRegisteredByFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {registeredByOptions.map((who) => (
                <SelectItem key={who} value={who}>
                  {who}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">Sessão (ID)</label>
          <Input
            type="number"
            placeholder="Ex: 12"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-[180px]">
          <label className="text-xs text-muted-foreground mb-1 block">Situação</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
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
                setTrackingFilter("");
                setSessionFilter("");
                setStatusFilter("ALL");
                setRegisteredByFilter("ALL");
                setDateFilter("");
                setDateFromFilter("");
                setDateToFilter("");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        )}

        <div className="flex items-end ml-auto text-sm text-muted-foreground">
          {!isLoading && (
            <span>
              {avarias.length} {avarias.length === 1 ? "registro" : "registros"}
            </span>
          )}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Rastreador</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Sessão</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando avarias...
                </TableCell>
              </TableRow>
            ) : avarias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma avaria encontrada para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              avarias.map((a: AvariaListItem) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setDetailId(a.id)}
                >
                  <TableCell className="whitespace-nowrap">{formatDateTime(a.createdAt)}</TableCell>
                  <TableCell className="font-mono font-medium">{a.trackingNumber}</TableCell>
                  <TableCell>{categoryLabel(a.category)}</TableCell>
                  <TableCell>{a.sessionId ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{statusLabel(a.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    {a.registeredBy ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                          <User className="h-3 w-3" />
                        </span>
                        {a.registeredBy}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.hasPhoto && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detalhe completo (com foto e descrição) */}
      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-red-500" />
              Detalhe da avaria
            </DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Código</p>
                  <p className="font-mono font-semibold">{detail.trackingNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">{categoryLabel(detail.category)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{formatDateTime(detail.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessão</p>
                  <p className="font-medium">{detail.sessionId ?? "Sem sessão"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Situação</p>
                  <p className="font-medium">{statusLabel(detail.status)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="font-medium">{detail.registeredBy ?? "Sem identificação"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="font-medium">{detail.description || "Sem descrição"}</p>
              </div>
              {detail.photo && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Foto</p>
                  <img
                    src={detail.photo}
                    alt="Foto da avaria"
                    className="max-h-72 w-full object-contain rounded-md border"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Carregando detalhe...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
