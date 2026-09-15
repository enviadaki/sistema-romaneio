import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import type { Operation } from "@/contexts/operation-context";

// Passo 4a do plano da AMAZON: abrir/fechar sessão (lote) de bipagem. Sem
// hook gerado pro orval pra essas rotas novas (não há gerador rodando neste
// projeto), então usa customFetch direto — mesmo padrão já usado em
// pre-sorter.tsx pra /api/cities.

export interface ScanSession {
  id: number;
  operation: string;
  filial: string | null;
  rota: string | null;
  status: "open" | "closed";
  openedBy: string | null;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
}

// Rota entra na chave da query: uma sessão "atual" de um bairro é uma coisa
// diferente da sessão "atual" de outro bairro dentro da mesma filial (ver
// plano: Vitória da Conquista exige escolher o bairro antes de bipar).
function currentSessionQueryKey(operation: Operation, filial?: string | null, rota?: string | null) {
  return ["scan-session-current", operation, filial ?? null, rota ?? null] as const;
}

export function useCurrentScanSession(
  operation: Operation,
  options?: { enabled?: boolean; filial?: string | null; rota?: string | null },
) {
  const filial = options?.filial ?? null;
  const rota = options?.rota ?? null;
  const params = new URLSearchParams({ operation });
  if (filial) params.set("filial", filial);
  if (rota) params.set("rota", rota);

  return useQuery({
    queryKey: currentSessionQueryKey(operation, filial, rota),
    queryFn: () => customFetch<ScanSession | null>(`/api/scan-sessions/current?${params.toString()}`),
    enabled: options?.enabled ?? true,
  });
}

export function useOpenScanSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { operation: Operation; filial?: string | null; rota?: string | null }) =>
      customFetch<ScanSession>("/api/scan-sessions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(
        currentSessionQueryKey(session.operation as Operation, session.filial, session.rota),
        session,
      );
    },
  });
}

export function useCloseScanSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (session: ScanSession) =>
      customFetch<ScanSession>(`/api/scan-sessions/${session.id}/close`, {
        method: "PATCH",
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(
        currentSessionQueryKey(session.operation as Operation, session.filial, session.rota),
        session,
      );
    },
  });
}

// Passo 8: resumo de encerramento de sessão — calculado no servidor (não a
// partir do contador ao vivo do navegador, que zera se a página
// recarregar), então funciona tanto pra sessão aberta quanto já encerrada.
export interface ScanSessionSummary {
  session: ScanSession;
  totals: {
    total: number;
    accepted: number;
    duplicate: number;
    notFound: number;
    invalidFormat: number;
    otherErrors: number;
  };
  avarias: number;
  pendingOperation: number;
}

export function useScanSessionSummary(sessionId: number | null) {
  return useQuery({
    queryKey: ["scan-session-summary", sessionId] as const,
    queryFn: () => customFetch<ScanSessionSummary>(`/api/scan-sessions/${sessionId}/summary`),
    enabled: sessionId !== null,
  });
}

// Relação de ocorrências (duplicado / não encontrado / fora do padrão)
// dentro de uma sessão — pedido logo depois do Passo 4b: os contadores
// mostram "quantos", isso mostra "quais".
export type ScanEventType = "duplicate" | "not_found" | "invalid_format" | "other_error";

export interface ScanEvent {
  id: number;
  sessionId: number | null;
  operation: string;
  trackingNumber: string;
  eventType: ScanEventType;
  scannedBy: string | null;
  createdAt: string;
}

function scanEventsQueryKey(sessionId: number | null, operation: Operation) {
  return ["scan-events", sessionId, operation] as const;
}

export function useScanEvents(sessionId: number | null, operation: Operation) {
  return useQuery({
    queryKey: scanEventsQueryKey(sessionId, operation),
    queryFn: () =>
      customFetch<ScanEvent[]>(`/api/scan-events?sessionId=${sessionId}&operation=${operation}`),
    enabled: sessionId !== null,
  });
}

export function useLogScanEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      sessionId: number | null;
      operation: Operation;
      trackingNumber: string;
      eventType: ScanEventType;
    }) =>
      customFetch<ScanEvent>("/api/scan-events", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_event, variables) => {
      queryClient.invalidateQueries({
        queryKey: scanEventsQueryKey(variables.sessionId, variables.operation),
      });
    },
    // Fire-and-forget: um erro ao registrar a ocorrência nunca deve
    // interromper a bipagem em si, só fica sem entrar na relação.
    onError: () => {},
  });
}
