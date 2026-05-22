import { useState, useMemo } from "react";
import { customFetch } from "@workspace/api-client-react";
import type { DeliveryManifest } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTodayDateString } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Truck, CheckCircle, Clock, Loader2, Trash2 } from "lucide-react";

function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrencyBR(val: string | null | undefined): string {
  if (!val) return "—";
  return parseFloat(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string | null }> = {
  ABERTO: { label: "Aberto", color: "bg-yellow-100 text-yellow-800 border-yellow-200", next: "ENTREGUE" },
  ENTREGUE: { label: "Entregue", color: "bg-blue-100 text-blue-800 border-blue-200", next: "PAGO" },
  PAGO: { label: "Pago", color: "bg-green-100 text-green-800 border-green-200", next: null },
};

function useManifests(params: Record<string, string>) {
  return useQuery<DeliveryManifest[]>({
    queryKey: ["delivery-manifests", params],
    queryFn: () => {
      const qs = new URLSearchParams(params).toString();
      return customFetch<DeliveryManifest[]>(`/api/delivery-manifests${qs ? `?${qs}` : ""}`);
    },
  });
}

export default function Financeiro() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [motoristaFilter, setMotoristaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selected, setSelected] = useState<DeliveryManifest | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editDataPagamento, setEditDataPagamento] = useState(getTodayDateString());
  const [editStatus, setEditStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const params: Record<string, string> = {};
  if (motoristaFilter) params.motorista = motoristaFilter;
  if (statusFilter !== "ALL") params.status = statusFilter;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data: manifests = [], isLoading } = useManifests(params);

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/delivery-manifests/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-manifests"] });
      toast({ title: "Romaneio excluído." });
    },
    onError: () => toast({ title: "Erro ao excluir romaneio.", variant: "destructive" }),
  });

  // Stats
  const stats = useMemo(() => {
    const total = manifests.length;
    const pendentes = manifests.filter((m) => m.status !== "PAGO").length;
    const valorPagoTotal = manifests
      .filter((m) => m.status === "PAGO" && m.valorPagamento)
      .reduce((s, m) => s + parseFloat(m.valorPagamento!), 0);
    const volumesTotal = manifests.reduce((s, m) => {
      return s + m.items.reduce((si, it) => si + it.sacas + it.avulsos, 0);
    }, 0);
    return { total, pendentes, valorPagoTotal, volumesTotal };
  }, [manifests]);

  // Motoristas únicos para relatório
  const motoristas = useMemo(() => {
    const set = new Set(manifests.map((m) => m.motorista));
    return [...set].sort();
  }, [manifests]);

  // Relatório por motorista
  const relatorio = useMemo(() => {
    return motoristas.map((mot) => {
      const items = manifests.filter((m) => m.motorista === mot);
      const romaneios = items.length;
      const volumes = items.reduce(
        (s, m) => s + m.items.reduce((si, it) => si + it.sacas + it.avulsos, 0),
        0
      );
      const valorTotal = items
        .filter((m) => m.valorPagamento)
        .reduce((s, m) => s + parseFloat(m.valorPagamento!), 0);
      const pagos = items.filter((m) => m.status === "PAGO").length;
      return { motorista: mot, romaneios, volumes, valorTotal, pagos };
    });
  }, [motoristas, manifests]);

  function openModal(manifest: DeliveryManifest) {
    setSelected(manifest);
    setEditValor(manifest.valorPagamento ?? "");
    setEditDataPagamento(manifest.dataPagamento ?? getTodayDateString());
    setEditStatus(manifest.status);
  }

  async function handleUpdateStatus() {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      await customFetch(`/api/delivery-manifests/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: editStatus,
          valorPagamento: editValor ? parseFloat(editValor.replace(",", ".")) : undefined,
          dataPagamento: editStatus === "PAGO" ? editDataPagamento : undefined,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["delivery-manifests"] });
      toast({ title: "Status atualizado com sucesso!" });
      setSelected(null);
    } catch {
      toast({ title: "Erro ao atualizar status.", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground mt-2">
          Controle de pagamentos aos motoristas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Romaneios</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Pago</p>
                <p className="text-xl font-bold">
                  {stats.valorPagoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Volumes</p>
                <p className="text-2xl font-bold">{stats.volumesTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Motorista</label>
          <Input
            className="w-[200px]"
            placeholder="Filtrar por motorista"
            value={motoristaFilter}
            onChange={(e) => setMotoristaFilter(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ABERTO">Aberto</SelectItem>
              <SelectItem value="ENTREGUE">Entregue</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">De</label>
          <Input type="date" className="w-[145px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Até</label>
          <Input type="date" className="w-[145px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {(motoristaFilter || statusFilter !== "ALL" || dateFrom || dateTo) && (
          <Button
            variant="outline"
            onClick={() => {
              setMotoristaFilter("");
              setStatusFilter("ALL");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Manifests table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Nº</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead className="text-center">Volumes</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pgto em</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : manifests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Nenhum romaneio encontrado.
                </TableCell>
              </TableRow>
            ) : (
              manifests.map((m) => {
                const volumes = m.items.reduce((s, it) => s + it.sacas + it.avulsos, 0);
                const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.ABERTO;
                return (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openModal(m)}
                  >
                    <TableCell className="font-bold text-primary">#{m.numero}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateBR(m.createdAt)}</TableCell>
                    <TableCell className="font-medium">{m.motorista}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {m.rota}
                    </TableCell>
                    <TableCell className="text-center font-medium">{volumes}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrencyBR(m.valorPagamento)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateBR(m.dataPagamento)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(m.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Relatório por motorista */}
      {relatorio.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo por Motorista</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-center">Romaneios</TableHead>
                  <TableHead className="text-center">Pagos</TableHead>
                  <TableHead className="text-center">Volumes</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorio.map((r) => (
                  <TableRow key={r.motorista}>
                    <TableCell className="font-medium">{r.motorista}</TableCell>
                    <TableCell className="text-center">{r.romaneios}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-700 font-medium">{r.pagos}</span>
                      {" / "}
                      <span className="text-muted-foreground">{r.romaneios}</span>
                    </TableCell>
                    <TableCell className="text-center">{r.volumes}</TableCell>
                    <TableCell className="text-right font-medium">
                      {r.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal de atualização */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Romaneio #{selected.numero} — {selected.motorista}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selected.rota}</span>
                {" · "}
                {formatDateBR(selected.createdAt)}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABERTO">Aberto</SelectItem>
                    <SelectItem value="ENTREGUE">Entregue</SelectItem>
                    <SelectItem value="PAGO">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Pagamento (R$)</label>
                <Input
                  placeholder="0,00"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                />
              </div>

              {editStatus === "PAGO" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Data do Pagamento</label>
                  <Input
                    type="date"
                    value={editDataPagamento}
                    onChange={(e) => setEditDataPagamento(e.target.value)}
                  />
                </div>
              )}

              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volumes:</span>
                  <span className="font-medium">
                    {selected.items.reduce((s, it) => s + it.sacas + it.avulsos, 0)}
                  </span>
                </div>
                {selected.items.slice(0, 4).map((it, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{it.cidade} · {it.empresa}</span>
                    <span>{it.sacas + it.avulsos} vol.</span>
                  </div>
                ))}
                {selected.items.length > 4 && (
                  <p className="text-xs text-muted-foreground">+{selected.items.length - 4} cidades…</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button onClick={handleUpdateStatus} disabled={updatingStatus}>
                {updatingStatus ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                ) : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
