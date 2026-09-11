import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch, ApiError } from "@workspace/api-client-react";
import type { Operation } from "@/contexts/operation-context";

// Passo 6 do plano da AMAZON: registro manual de avaria. Sem hook gerado
// pro orval pra essa rota nova — customFetch direto, mesmo padrão do resto
// das rotas novas deste projeto.

export const AVARIA_CATEGORIES = [
  { value: "caixa_amassada", label: "Caixa amassada" },
  { value: "molhado", label: "Molhado / dano por umidade" },
  { value: "lacre_violado", label: "Lacre violado" },
  { value: "conteudo_incompleto", label: "Conteúdo incompleto" },
  { value: "outro", label: "Outro" },
] as const;
export type AvariaCategory = (typeof AVARIA_CATEGORIES)[number]["value"];

export interface AvariaInput {
  trackingNumber: string;
  operation: Operation;
  sessionId: number | null;
  category: AvariaCategory;
  description: string | null;
  photo: string | null;
  confirm?: boolean;
}

export interface AvariaCreated {
  id: number;
  trackingNumber: string;
  operation: string;
  category: string;
  description: string | null;
  hasPhoto: boolean;
  status: string;
  registeredBy: string | null;
  createdAt: string;
}

export interface AvariaExisting {
  category: string;
  createdAt: string;
  registeredBy: string | null;
}

export function avariaTrackingNumbersQueryKey(operation: Operation) {
  return ["avarias", operation] as const;
}

export interface AvariaListItem {
  id: number;
  trackingNumber: string;
  category: string;
  sessionId: number | null;
  status: string;
  registeredBy: string | null;
  hasPhoto: boolean;
  createdAt: string;
}

// Lista enxuta de avarias da operação — usada pra tirar da "Faltantes
// (Esperados)" do Pré-Sorter qualquer código que já tenha avaria
// registrada (essa lista é montada no cliente comparando pacotes x
// bipagens de hoje, então precisa saber também quais têm avaria).
export function useAvariaTrackingNumbers(operation: Operation, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: avariaTrackingNumbersQueryKey(operation),
    queryFn: () => customFetch<AvariaListItem[]>(`/api/avarias?operation=${operation}`),
    enabled: options?.enabled ?? true,
  });
}

// Passo 7: histórico/consulta de avarias, com os mesmos filtros já
// combinados no planejamento (período, código, usuário, sessão,
// situação). Reaproveita a mesma rota GET /avarias, só que com filtros
// extras — a chave de cache inclui os filtros pra cada combinação ter
// seu próprio cache.
export interface AvariasHistoricoFilters {
  operation: Operation;
  trackingNumber?: string;
  registeredBy?: string;
  sessionId?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

function avariasHistoricoQueryKey(filters: AvariasHistoricoFilters) {
  return ["avarias-historico", filters] as const;
}

export function useAvariasHistorico(filters: AvariasHistoricoFilters) {
  return useQuery({
    queryKey: avariasHistoricoQueryKey(filters),
    queryFn: () => {
      const params = new URLSearchParams({ operation: filters.operation });
      if (filters.trackingNumber) params.set("trackingNumber", filters.trackingNumber);
      if (filters.registeredBy) params.set("registeredBy", filters.registeredBy);
      if (filters.sessionId !== undefined) params.set("sessionId", String(filters.sessionId));
      if (filters.status) params.set("status", filters.status);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      return customFetch<AvariaListItem[]>(`/api/avarias?${params.toString()}`);
    },
  });
}

export interface AvariaDetail {
  id: number;
  trackingNumber: string;
  operation: string;
  sessionId: number | null;
  category: string;
  description: string | null;
  photo: string | null;
  status: string;
  registeredBy: string | null;
  createdAt: string;
}

// Detalhe completo (com foto) — buscado só quando o operador abre o
// registro no histórico, pra não carregar toda foto em base64 na lista.
export function useAvariaDetail(id: number | null, operation: Operation) {
  return useQuery({
    queryKey: ["avaria-detail", id, operation] as const,
    queryFn: () => customFetch<AvariaDetail>(`/api/avarias/${id}?operation=${operation}`),
    enabled: id !== null,
  });
}

export function useCreateAvaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AvariaInput) =>
      customFetch<AvariaCreated>("/api/avarias", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_created, variables) => {
      queryClient.invalidateQueries({
        queryKey: avariaTrackingNumbersQueryKey(variables.operation),
      });
    },
  });
}

// Ajuda a distinguir "já existe avaria" (409, com detalhe pra confirmar) de
// qualquer outro erro real.
export function getExistingAvaria(error: unknown): AvariaExisting | null {
  if (error instanceof ApiError && error.status === 409) {
    const data = error.data as { existing?: AvariaExisting } | null;
    return data?.existing ?? null;
  }
  return null;
}
