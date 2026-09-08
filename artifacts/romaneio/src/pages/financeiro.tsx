import { useState, useMemo } from "react";
import { customFetch } from "@workspace/api-client-react";
import type { DeliveryManifest } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTodayDateString } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  DollarSign, Truck, CheckCircle, Clock, Loader2, Trash2, Eye, FileDown,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

async function getLogoImg() {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    const base = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL;
    img.src = `${base}/enviadaki-logo.png`;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
  });
}

function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrencyBR(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return parseFloat(String(val)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

// ── Visualizador completo do romaneio ─────────────────────────────────────────
function ManifestViewer({ manifest, onClose }: { manifest: DeliveryManifest; onClose: () => void }) {
  const totalSacas = manifest.items.reduce((s, it) => s + it.sacas, 0);
  const totalAvulsos = manifest.items.reduce((s, it) => s + it.avulsos, 0);
  const totalVolumes = totalSacas + totalAvulsos;

  const km = manifest.km ? parseFloat(String(manifest.km)) : null;
  const valorPorKm = manifest.valorPorKm ? parseFloat(String(manifest.valorPorKm)) : null;
  const valorCalculado = km && valorPorKm ? km * valorPorKm : null;

  // Divisão do valor total do frete entre as operações, proporcional ao volume de cada uma
  const operacaoBreakdown = useMemo(() => {
    if (!valorCalculado || valorCalculado <= 0 || totalVolumes === 0) return [];
    const volumesPorEmpresa = new Map<string, number>();
    for (const it of manifest.items) {
      const volume = it.sacas + it.avulsos;
      if (volume === 0) continue;
      const empresa = it.empresa ?? "—";
      volumesPorEmpresa.set(empresa, (volumesPorEmpresa.get(empresa) ?? 0) + volume);
    }
    return Array.from(volumesPorEmpresa.entries())
      .map(([empresa, volume]) => ({
        empresa,
        volume,
        percentual: volume / totalVolumes,
        valor: (volume / totalVolumes) * valorCalculado,
      }))
      .sort((a, b) => b.volume - a.volume);
  }, [manifest.items, totalVolumes, valorCalculado]);

  async function handleExportPDF() {
    const numero = manifest.numero ?? "—";
    const dataStr = formatDateBR(manifest.createdAt);
    const logoImg = await getLogoImg();

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const mg = 8;

    // Header
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, 14, "F");
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      doc.addImage(logoImg, "PNG", mg, 2, 30, 10);
    }
    doc.setTextColor(20, 30, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("ROMANEIO DE ENTREGA", W / 2, 9, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Nº: ${numero}`, W - mg, 9, { align: "right" });

    // Info block
    doc.setFillColor(240, 244, 250);
    doc.rect(0, 15, W, 22, "F");
    doc.setTextColor(15, 40, 80);
    doc.setFontSize(8.5);
    const c1 = mg, c2 = W * 0.22, c3 = W * 0.45, c4 = W * 0.66, c5 = W * 0.83;
    const r1 = 22, r2 = 31;
    const bf = (label: string, val: string, x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.text(val, x + doc.getTextWidth(label) + 1.5, y);
    };
    bf("DATA:", dataStr, c1, r1);
    bf("CONFERENTE:", (manifest.conferente ?? "").toUpperCase(), c2, r1);
    bf("MOTORISTA:", manifest.motorista.toUpperCase(), c2, r2);
    bf("CONTATO:", manifest.contatoMotorista ?? "—", c3, r1);
    bf("ROTA PORTA A PORTA:", String(manifest.rotaPortaAPorta ?? 0), c3, r2);
    if (km !== null) bf("KM:", String(km), c4, r1);
    if (valorPorKm !== null) {
      bf("VALOR/KM:", `R$ ${valorPorKm.toFixed(4).replace(".", ",")}`, c4, r2);
    }
    if (valorCalculado !== null) {
      bf("VALOR MOTORISTA:", formatCurrencyBR(valorCalculado), c5, r1);
    }
    bf("ROTA:", manifest.rota, c5, r2);

    // Table
    const tableRows = manifest.items.map((it) => [
      it.empresa ?? "",
      it.sacas > 0 ? String(it.sacas) : "",
      it.avulsos > 0 ? String(it.avulsos) : "",
      String(it.sacas + it.avulsos),
      it.cidade.toUpperCase(),
      (it.responsavel ?? "").toUpperCase(),
      it.contato ?? "",
      "",
    ]);
    while (tableRows.length < 20) tableRows.push(["", "", "", "", "", "", "", ""]);

    autoTable(doc, {
      startY: 39,
      head: [["EMPRESA", "SACAS", "AVULSOS", "TOTAL", "CIDADES", "RESPONSÁVEL RECEBIMENTO", "CONTATO", "ASSINATURA DO ENTREGADOR"]],
      body: tableRows,
      margin: { left: mg, right: mg },
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.5, valign: "middle" },
      headStyles: { fillColor: [15, 40, 80], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 7 },
      columnStyles: {
        0: { halign: "center", cellWidth: 18 },
        1: { halign: "center", cellWidth: 13 },
        2: { halign: "center", cellWidth: 14 },
        3: { halign: "center", cellWidth: 13 },
        4: { cellWidth: 30 },
        5: { cellWidth: 52 },
        6: { cellWidth: 30 },
        7: { cellWidth: 38 },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY ?? H - 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 40, 80);
    doc.text(`TOTAL: ${totalVolumes} volumes  (${totalSacas} sacas + ${totalAvulsos} avulsos)`, mg, finalY + 6);
    if (km && valorPorKm && valorCalculado) {
      doc.text(
        `${km} km × R$ ${valorPorKm.toFixed(4).replace(".", ",")} = ${formatCurrencyBR(valorCalculado)}`,
        W - mg,
        finalY + 6,
        { align: "right" }
      );
    }
    if (operacaoBreakdown.length > 0) {
      const breakdownText = operacaoBreakdown
        .map((op) => `${op.empresa}: ${op.volume} vol. - ${formatCurrencyBR(op.valor)} (${(op.percentual * 100).toFixed(0)}%)`)
        .join("   |   ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 40, 80);
      doc.text(`DIVISÃO DO FRETE POR OPERAÇÃO: ${breakdownText}`, mg, finalY + 11);
    }

    const fy = H - 12;
    doc.setDrawColor(15, 40, 80);
    doc.setLineWidth(0.4);
    doc.line(mg, fy, mg + 70, fy);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("ASSINATURA CONFERENTE", mg + 35, fy + 4, { align: "center" });
    doc.line(W - mg - 70, fy, W - mg, fy);
    doc.text("ASSINATURA MOTORISTA", W - mg - 35, fy + 4, { align: "center" });

    doc.save(`romaneio-${numero}-${manifest.createdAt?.slice(0, 10) ?? "data"}.pdf`);
  }

  const cfg = STATUS_CONFIG[manifest.status] ?? STATUS_CONFIG.ABERTO;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-3">
            <span>Romaneio <span className="text-primary font-extrabold">#{manifest.numero}</span></span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
              {cfg.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Header info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg bg-muted/50 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-medium">{formatDateBR(manifest.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Motorista</p>
            <p className="font-semibold">{manifest.motorista}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contato</p>
            <p className="font-medium">{manifest.contatoMotorista || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conferente</p>
            <p className="font-medium">{manifest.conferente || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rota</p>
            <p className="font-medium">{manifest.rota}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rota Porta a Porta</p>
            <p className="font-medium">{manifest.rotaPortaAPorta ?? 0}</p>
          </div>
          {km !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Quilômetros</p>
              <p className="font-medium">{km} km</p>
            </div>
          )}
          {valorPorKm !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Valor por km</p>
              <p className="font-medium">R$ {valorPorKm.toFixed(4).replace(".", ",")}</p>
            </div>
          )}
          {valorCalculado !== null && (
            <div className="col-span-1 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Valor Motorista</p>
              <p className="text-base font-bold text-primary">{formatCurrencyBR(valorCalculado)}</p>
            </div>
          )}
          {manifest.valorPagamento && (
            <div>
              <p className="text-xs text-muted-foreground">Valor Pago</p>
              <p className="font-bold text-green-700">{formatCurrencyBR(manifest.valorPagamento)}</p>
            </div>
          )}
          {manifest.dataPagamento && (
            <div>
              <p className="text-xs text-muted-foreground">Data Pagamento</p>
              <p className="font-medium">{formatDateBR(manifest.dataPagamento)}</p>
            </div>
          )}
          {manifest.observacoes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="font-medium">{manifest.observacoes}</p>
            </div>
          )}
          {operacaoBreakdown.length > 0 && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground mb-1">Divisão do frete por operação</p>
              <div className="flex flex-wrap gap-2">
                {operacaoBreakdown.map((op) => (
                  <span
                    key={op.empresa}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs"
                  >
                    <span className="font-semibold">{op.empresa}</span>
                    <span className="text-muted-foreground">{op.volume} vol. ({(op.percentual * 100).toFixed(0)}%)</span>
                    <span className="font-bold text-primary">{formatCurrencyBR(op.valor)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Totals summary */}
        <div className="flex gap-3 flex-wrap">
          <div className="rounded-md bg-primary/10 px-4 py-2 text-center min-w-[90px]">
            <p className="text-xs text-muted-foreground">Volumes</p>
            <p className="text-xl font-bold text-primary">{totalVolumes}</p>
          </div>
          <div className="rounded-md bg-muted px-4 py-2 text-center min-w-[90px]">
            <p className="text-xs text-muted-foreground">Sacas</p>
            <p className="text-xl font-bold">{totalSacas}</p>
          </div>
          <div className="rounded-md bg-muted px-4 py-2 text-center min-w-[90px]">
            <p className="text-xs text-muted-foreground">Avulsos</p>
            <p className="text-xl font-bold">{totalAvulsos}</p>
          </div>
          <div className="rounded-md bg-muted px-4 py-2 text-center min-w-[90px]">
            <p className="text-xs text-muted-foreground">Cidades</p>
            <p className="text-xl font-bold">{manifest.items.length}</p>
          </div>
        </div>

        {/* Items table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px] text-center">#</TableHead>
                <TableHead className="w-[90px]">Empresa</TableHead>
                <TableHead className="w-[70px] text-center">Sacas</TableHead>
                <TableHead className="w-[70px] text-center">Avulsos</TableHead>
                <TableHead className="w-[60px] text-center font-bold">Total</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Contato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manifest.items.map((it, i) => (
                <TableRow key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {it.empresa ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{it.sacas > 0 ? it.sacas : <span className="text-muted-foreground/40">—</span>}</TableCell>
                  <TableCell className="text-center">{it.avulsos > 0 ? it.avulsos : <span className="text-muted-foreground/40">—</span>}</TableCell>
                  <TableCell className="text-center font-bold">{it.sacas + it.avulsos}</TableCell>
                  <TableCell className="font-medium">{it.cidade}</TableCell>
                  <TableCell className="text-sm">{it.responsavel || <span className="text-muted-foreground/50">—</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{it.contato || "—"}</TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-primary/5 font-bold border-t-2">
                <TableCell colSpan={2} className="text-right text-xs text-muted-foreground">TOTAL</TableCell>
                <TableCell className="text-center">{totalSacas}</TableCell>
                <TableCell className="text-center">{totalAvulsos}</TableCell>
                <TableCell className="text-center text-primary">{totalVolumes}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Financeiro() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [motoristaFilter, setMotoristaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selected, setSelected] = useState<DeliveryManifest | null>(null);
  const [viewing, setViewing] = useState<DeliveryManifest | null>(null);
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
              <TableHead className="w-[100px]"></TableHead>
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Visualizar romaneio completo"
                          onClick={(e) => { e.stopPropagation(); setViewing(m); }}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(m.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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

      {/* Modal de atualização de status */}
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
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => { setSelected(null); setViewing(selected); }}
              >
                <Eye className="h-4 w-4 mr-2" /> Ver Completo
              </Button>
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

      {/* Visualizador completo */}
      {viewing && (
        <ManifestViewer manifest={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
