import { useMutation } from "@tanstack/react-query";
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

export function useCreateAvaria() {
  return useMutation({
    mutationFn: (input: AvariaInput) =>
      customFetch<AvariaCreated>("/api/avarias", {
        method: "POST",
        body: JSON.stringify(input),
      }),
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
