import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

// Passo 12 do plano da AMAZON: consulta do log de auditoria consolidado.
// Mesmo padrão das outras rotas novas deste projeto (sem gerador orval) —
// customFetch direto.

export const AUDIT_EVENT_LABELS: Record<string, string> = {
  scan_accepted: "Bipagem aceita",
  scan_bulk_accepted: "Bipagem em lote",
  avaria_registrada: "Avaria registrada",
  session_opened: "Sessão aberta",
  session_closed: "Sessão encerrada",
  package_created: "Pacote cadastrado",
  package_deleted: "Pacote removido",
  manifest_created: "Romaneio motorista criado",
  manifest_status_changed: "Romaneio motorista — status alterado",
  manifest_deleted: "Romaneio motorista removido",
  access_denied: "Acesso negado",
  operator_login: "Login de operador",
};

export interface AuditEvent {
  id: number;
  eventType: string;
  operation: string | null;
  trackingNumber: string | null;
  sessionId: number | null;
  recordId: number | null;
  performedBy: string | null;
  details: string | null;
  createdAt: string;
}

export interface AuditEventsFilters {
  eventType?: string;
  operation?: string;
  trackingNumber?: string;
  performedBy?: string;
  sessionId?: number;
  dateFrom?: string;
  dateTo?: string;
}

function auditEventsQueryKey(filters: AuditEventsFilters) {
  return ["audit-events", filters] as const;
}

export function useAuditEvents(filters: AuditEventsFilters) {
  return useQuery({
    queryKey: auditEventsQueryKey(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.eventType) params.set("eventType", filters.eventType);
      if (filters.operation) params.set("operation", filters.operation);
      if (filters.trackingNumber) params.set("trackingNumber", filters.trackingNumber);
      if (filters.performedBy) params.set("performedBy", filters.performedBy);
      if (filters.sessionId !== undefined) params.set("sessionId", String(filters.sessionId));
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      return customFetch<{ events: AuditEvent[]; truncated: boolean }>(
        `/api/audit-events?${params.toString()}`,
      );
    },
  });
}

export function useAuditEventTypes() {
  return useQuery({
    queryKey: ["audit-event-types"] as const,
    queryFn: () => customFetch<string[]>("/api/audit-events/types"),
    staleTime: Infinity,
  });
}
