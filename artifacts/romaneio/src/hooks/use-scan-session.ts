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
  status: "open" | "closed";
  openedBy: string | null;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
}

function currentSessionQueryKey(operation: Operation) {
  return ["scan-session-current", operation] as const;
}

export function useCurrentScanSession(operation: Operation, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: currentSessionQueryKey(operation),
    queryFn: () =>
      customFetch<ScanSession | null>(`/api/scan-sessions/current?operation=${operation}`),
    enabled: options?.enabled ?? true,
  });
}

export function useOpenScanSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operation: Operation) =>
      customFetch<ScanSession>("/api/scan-sessions", {
        method: "POST",
        body: JSON.stringify({ operation }),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(currentSessionQueryKey(session.operation as Operation), session);
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
      queryClient.setQueryData(currentSessionQueryKey(session.operation as Operation), session);
    },
  });
}
