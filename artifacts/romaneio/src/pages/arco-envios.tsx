import { useState } from "react";
import {
  useListArcoEnvios,
  useGetArcoEnvio,
  useGetArcoAgenteStatus,
  useReenviarArcoEnvioFalhas,
  useCancelarArcoEnvio,
  getListArcoEnviosQueryKey,
  getGetArcoEnvioQueryKey,
  getGetArcoAgenteStatusQueryKey,
  ApiError,
  type ArcoEnvio,
  type ArcoEnvioStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Circle, RotateCcw, Ban } from "lucide-react";

const STATUS_LABELS: Record<ArcoEnvioStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  concluido_com_erros: "Concluído com erros",
  falhou: "Falhou",
  interrompido: "Interrompido",
  cancelado: "Cancelado",
};

const STATUS_CLASSES: Record<ArcoEnvioStatus, string> = {
  pendente: "bg-slate-100 text-slate-700 border-slate-200",
  em_andamento: "bg-blue-50 text-blue-700 border-blue-200",
  concluido: "bg-green-50 text-green-700 border-green-200",
  concluido_com_erros: "bg-amber-50 text-amber-700 border-amber-200",
  falhou: "bg-red-50 text-red-700 border-red-200",
  interrompido: "bg-orange-50 text-orange-700 border-orange-200",
  cancelado: "bg-slate-50 text-slate-500 border-slate-200",
};

const ACTIVE_STATUSES: ArcoEnvioStatus[] = ["pendente", "em_andamento"];

function StatusBadge({ status }: { status: ArcoEnvioStatus }) {
  return <Badge variant="outline" className={STATUS_CLASSES[status]}>{STATUS_LABELS[status]}</Badge>;
}

function AgenteStatusIndicator() {
  const { data } = useGetArcoAgenteStatus({
    query: { queryKey: getGetArcoAgenteStatusQueryKey(), refetchInterval: 10_000 },
  });
  const online = data?.online ?? false;
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Circle className={`h-2.5 w-2.5 ${online ? "fill-green-500 text-green-500" : "fill-slate-300 text-slate-300"}`} />
      <span className="text-muted-foreground">Agente {online ? "online" : "offline"}</span>
    </div>
  );
}

function EnvioDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: envio, isLoading } = useGetArcoEnvio(id ?? 0, {
    query: {
      queryKey: getGetArcoEnvioQueryKey(id ?? 0),
      enabled: id !== null,
      refetchInterval: (query) =>
        query.state.data && ACTIVE_STATUSES.includes(query.state.data.status) ? 5_000 : false,
    },
  });

  const reenviar = useReenviarArcoEnvioFalhas();
  const cancelar = useCancelarArcoEnvio();

  const handleReenviarFalhas = () => {
    if (id === null) return;
    reenviar.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Reenvio criado com os itens com erro/não processados." });
          queryClient.invalidateQueries({ queryKey: getListArcoEnviosQueryKey() });
          onClose();
        },
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : String(err);
          toast({ title: "Erro ao reenviar falhas", description: message, variant: "destructive" });
        },
      },
    );
  };

  const handleCancelar = () => {
    if (id === null) return;
    cancelar.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Envio cancelado" });
          queryClient.invalidateQueries({ queryKey: getListArcoEnviosQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetArcoEnvioQueryKey(id) });
        },
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : String(err);
          toast({ title: "Erro ao cancelar", description: message, variant: "destructive" });
        },
      },
    );
  };

  const okCount = envio?.itens.filter((i) => i.status === "ok").length ?? 0;
  const erroCount = envio?.itens.filter((i) => i.status === "erro" || i.status === "nao_processado").length ?? 0;
  const total = envio?.itens.length ?? 0;
  const hasFalhas = erroCount > 0;
  const isBotoesFinais = envio?.erroGeral?.startsWith("BOTOES_FINAIS") ?? false;

  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Envio #{id} — {envio?.romaneioLabel}</DialogTitle>
        </DialogHeader>

        {isLoading || !envio ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={envio.status} />
              <span className="text-sm text-muted-foreground">
                {formatDate(envio.romaneioData)} — {okCount}/{total} ok
              </span>
            </div>

            <Progress value={total > 0 ? (okCount / total) * 100 : 0} className="h-2" />

            {isBotoesFinais && (
              <div className="text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-md px-4 py-3">
                Os códigos foram bipados, mas o agrupamento no ARCO não foi finalizado
                ({envio.erroGeral}). Confira manualmente no ARCO antes de considerar concluído.
              </div>
            )}
            {!isBotoesFinais && envio.erroGeral && (
              <div className="text-sm bg-red-50 text-red-800 border border-red-200 rounded-md px-4 py-3">
                {envio.erroGeral}
              </div>
            )}

            <div className="flex gap-2">
              {envio.status === "pendente" && (
                <Button variant="outline" size="sm" disabled={cancelar.isPending} onClick={handleCancelar}>
                  <Ban className="mr-2 h-4 w-4" />
                  Cancelar envio
                </Button>
              )}
              {hasFalhas && (
                <Button variant="outline" size="sm" disabled={reenviar.isPending} onClick={handleReenviarFalhas}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reenviar falhas ({erroCount})
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envio.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.status === "ok"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : item.status === "erro"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : item.status === "nao_processado"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }
                      >
                        {item.status === "nao_processado" ? "Não processado" : item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.erro ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ArcoEnvios() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: envios = [], isLoading } = useListArcoEnvios(
    { limit: 50 },
    {
      query: {
        queryKey: getListArcoEnviosQueryKey({ limit: 50 }),
        refetchInterval: (query) => {
          const list = query.state.data as ArcoEnvio[] | undefined;
          return list?.some((e) => ACTIVE_STATUSES.includes(e.status)) ? 5_000 : false;
        },
      },
    },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Envios ARCO</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe os envios de bipagem automática para o site da Loggi.
          </p>
        </div>
        <AgenteStatusIndicator />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : envios.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Nenhum envio ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Romaneio</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envios.map((envio) => (
                  <TableRow
                    key={envio.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedId(envio.id)}
                  >
                    <TableCell>{envio.id}</TableCell>
                    <TableCell className="font-medium">{envio.romaneioLabel}</TableCell>
                    <TableCell>{formatDate(envio.romaneioData)}</TableCell>
                    <TableCell><StatusBadge status={envio.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(envio.criadoEm).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EnvioDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
