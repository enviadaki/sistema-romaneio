import type { Operation } from "@/contexts/operation-context";

// Passo 11 do plano da AMAZON: mesmo estilo de badge já usado em
// pre-sorter.tsx, cadastro.tsx e romaneio.tsx, extraído pra componente
// compartilhado pra propagar de forma consistente pras telas que ainda não
// mostravam a operação ativa (histórico, consulta, avarias, dashboard,
// entrega, devoluções) sem duplicar a mesma string de classes seis vezes.
export function operationBadgeClasses(operation: Operation): string {
  return operation === "LOGGI"
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-orange-50 text-orange-700 border-orange-200";
}

export function OperationBadge({ operation, className = "" }: { operation: Operation; className?: string }) {
  return (
    <span
      className={`shrink-0 text-sm font-bold px-3 py-1 rounded-full border ${operationBadgeClasses(operation)} ${className}`}
    >
      {operation}
    </span>
  );
}
