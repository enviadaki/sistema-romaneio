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
