import { useState } from "react";
import { formatDateTime, getTodayDateString } from "@/lib/date-utils";
import { useAuditEvents, useAuditEventTypes, AUDIT_EVENT_LABELS } from "@/hooks/use-audit-events";

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
import { User, ShieldAlert } from "lucide-react";

// Passo 12 do plano da AMAZON: auditoria consolidada — log único e
// consultável dos eventos mais relevantes do sistema (bipagem aceita,
// avaria registrada, sessão aberta/encerrada, pacote criado/removido,
// romaneio motorista criado/status alterado/removido, acesso negado por
// operação, login de operador). Cada tabela de origem (scans, avarias,
// scan_sessions...) continua com seu próprio histórico completo — esta
// tela é só uma visão consolidada e filtrável por cima deles, não
// substitui nenhuma.

type DateMode = "day" | "period";

function eventLabel(eventType: string): string {
  return AUDIT_EVENT_LABELS[eventType] ?? eventType;
}

function eventBadgeVariant(eventType: string): "default" | "secondary" | "destructive" {
  if (eventType === "access_denied") return "destructive";
  if (eventType.endsWith("_deleted")) return "secondary";
  return "default";
}

export default function Auditoria() {
  const [dateMode, setDateMode] = useState<DateMode>("day");
  const [dateFilter, setDateFilter] = useState<string>(getTodayDateString());
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");
  const [operationFilter, setOperationFilter] = useState<string>("ALL");
  const [trackingFilter, setTrackingFilter] = useState("");
  const [performedByFilter, setPerformedByFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");

  const { data: eventTypes } = useAuditEventTypes();

  const sessionIdNum = sessionFilter.trim() ? parseInt(sessionFilter.trim(), 10) : undefined;

  const { data, isLoading } = useAuditEvents({
    eventType: eventTypeFilter !== "ALL" ? eventTypeFilter : undefined,
    operation: operationFilter !== "ALL" ? operationFilter : undefined,
    trackingNumber: trackingFilter.trim() || undefined,
    performedBy: performedByFilter.trim() || undefined,
    sessionId: sessionIdNum !== undefined && !Number.isNaN(sessionIdNum) ? sessionIdNum : undefined,
    dateFrom: dateMode === "day" ? dateFilter || undefined : dateFromFilter || undefined,
    dateTo: dateMode === "day" ? dateFilter || undefined : dateToFilter || undefined,
  });

  const events = data?.events ?? [];

  const hasActiveFilters =
    eventTypeFilter !== "ALL" ||
    operationFilter !== "ALL" ||
    trackingFilter !== "" ||
    performedByFilter !== "" ||
    sessionFilter !== "" ||
    (dateMode === "day" && dateFilter !== "") ||
    (dateMode === "period" && (dateFromFilter !== "" || dateToFilter !== ""));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          Auditoria
        </h1>
        <p className="text-muted-foreground mt-2">
          Log consolidado dos eventos mais relevantes do sistema, das duas operações.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-[220px]">
          <label className="text-xs text-muted-foreground mb-1 block">Tipo de evento</label>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {(eventTypes ?? []).map((t) => (
                <SelectItem key={t} value={t}>
                  {eventLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">Operação</label>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="LOGGI">LOGGI</SelectItem>
              <SelectItem value="AMAZON">AMAZON</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

        <div className="w-full sm:w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Responsável</label>
          <Input
            placeholder="Nome..."
            value={performedByFilter}
            onChange={(e) => setPerformedByFilter(e.target.value)}
          />
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

        {hasActiveFilters && (
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setEventTypeFilter("ALL");
                setOperationFilter("ALL");
                setTrackingFilter("");
                setPerformedByFilter("");
                setSessionFilter("");
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
              {events.length} {events.length === 1 ? "evento" : "eventos"}
              {data?.truncated ? " (mostrando os mais recentes — refine os filtros para ver mais)" : ""}
            </span>
          )}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Rastreador</TableHead>
              <TableHead>Sessão</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando eventos...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum evento encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(e.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={eventBadgeVariant(e.eventType)}>{eventLabel(e.eventType)}</Badge>
                  </TableCell>
                  <TableCell>
                    {e.operation ? (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          e.operation === "LOGGI"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                        }`}
                      >
                        {e.operation}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {e.trackingNumber ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{e.sessionId ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {e.performedBy ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                          <User className="h-3 w-3" />
                        </span>
                        {e.performedBy}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate">
                    {e.details ?? "—"}
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
