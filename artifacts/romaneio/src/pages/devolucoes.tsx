import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  customFetch,
  getListReturnProtocolsQueryKey,
  useListReturnProtocols,
  type ReturnProtocol,
  type ReturnProtocolItemInput,
} from "@workspace/api-client-react";
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

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  FileDown,
  Loader2,
  PackagePlus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { useOperation } from "@/contexts/operation-context";
import { getTodayDateString } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type CadastroPessoa = { id: number; nome: string; contato?: string };
type PacoteLocal = {
  trackingNumber: string;
  city: string;
  promisedDeliveryDate: string | null;
  operation: string;
};
type DraftItem = ReturnProtocolItemInput & { origem: "local" | "manual" };

const MOTIVOS = [
  "Recusa do destinatário",
  "Avaria",
  "Endereço não localizado",
  "Prazo excedido",
  "Divergência de volume",
  "Pacote não pertencente à rota",
  "Outros",
];

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function protocolNumber(protocol: Pick<ReturnProtocol, "numero" | "dataDevolucao">): string {
  return `DEV-${protocol.dataDevolucao.slice(0, 4)}-${String(protocol.numero).padStart(6, "0")}`;
}

function statusBadge(status: ReturnProtocol["status"]) {
  if (status === "CANCELADO") return <Badge variant="destructive">Cancelado</Badge>;
  if (status === "RASCUNHO") return <Badge variant="secondary">Rascunho</Badge>;
  return <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">Emitido</Badge>;
}

async function exportProtocolPdf(protocol: ReturnProtocol) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const number = protocolNumber(protocol);
  const totalVolumes = protocol.items.reduce((sum, item) => sum + item.quantidadeVolumes, 0);
  const logoImg = await getLogoImg();

  const drawCopy = (top: number, copyLabel: string) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, top, pageWidth, 14, "F");
    
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      doc.addImage(logoImg, "PNG", 10, top + 2, 30, 10);
    }

    doc.setTextColor(20, 30, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PROTOCOLO DE DEVOLUÇÃO", pageWidth / 2, top + 9, { align: "center" });
    doc.setFontSize(8);
    doc.text(`${number} · ${copyLabel}`, pageWidth - 10, top + 9, { align: "right" });

    doc.setFillColor(240, 244, 250);
    doc.rect(0, top + 15, pageWidth, 24, "F");

    doc.setTextColor(20, 30, 45);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(`DATA: ${formatDate(protocol.dataDevolucao)}`, 10, top + 20);
     doc.text(`STATUS: ${protocol.status}`, 105, top + 20);
    doc.text(`MOTORISTA: ${protocol.motorista}`, 10, top + 26);
    doc.text(`CONFERENTE: ${protocol.conferente}`, 105, top + 26);
    doc.text(`MOTIVO: ${protocol.motivo}`, 10, top + 32);
    if (protocol.observacoes) {
      const text = doc.splitTextToSize(`OBS.: ${protocol.observacoes}`, pageWidth - 20);
      doc.setFont("helvetica", "normal");
      doc.text(text.slice(0, 2), 10, top + 37);
    }

    autoTable(doc, {
      startY: top + 42,
      head: [["Código / referência", "Tipo", "Cidade / rota", "Vol."]],
      body: protocol.items.map((item) => [
        item.referencia,
        item.tipo === "MANUAL" ? "SEM RASTREABILIDADE" : "CADASTRO LOCAL",
        [item.cidade, item.rota].filter(Boolean).join(" / ") || "—",
        String(item.quantidadeVolumes),
      ]),
      margin: { left: 10, right: 10 },
      styles: { fontSize: 6.3, cellPadding: 1.3, overflow: "linebreak" },
      headStyles: { fillColor: [30, 58, 95], fontSize: 6.5 },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 52 },
        2: { cellWidth: 68 },
        3: { cellWidth: 12, halign: "center" },
      },
      theme: "grid",
    });

    const footerY = Math.max(top + 105, (doc as any).lastAutoTable?.finalY + 7 || top + 105);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${protocol.items.length} item(ns) · ${totalVolumes} volume(s)`, 10, footerY);
    doc.setDrawColor(80, 90, 105);
    doc.line(18, footerY + 16, 88, footerY + 16);
    doc.line(120, footerY + 16, 190, footerY + 16);
    doc.setFont("helvetica", "normal");
    doc.text("Assinatura do motorista", 53, footerY + 20, { align: "center" });
    doc.text("Assinatura do conferente", 155, footerY + 20, { align: "center" });
  };

  drawCopy(0, "VIA DO ARQUIVO");
  doc.setDrawColor(130, 130, 130);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(5, 148.5, pageWidth - 5, 148.5);
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text("linha de corte", pageWidth / 2, 146.5, { align: "center" });
  doc.setLineDashPattern([], 0);
  drawCopy(149.5, "VIA DO MOTORISTA");
  doc.save(`${number}.pdf`);
}

export default function Devolucoes() {
  const { operation } = useOperation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dataDevolucao, setDataDevolucao] = useState(getTodayDateString());
  const [motorista, setMotorista] = useState("");
  const [conferente, setConferente] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [lastCreated, setLastCreated] = useState<ReturnProtocol | null>(null);
  const [selected, setSelected] = useState<ReturnProtocol | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReturnProtocol | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [motoristaFilter, setMotoristaFilter] = useState("ALL");
  const [motivoFilter, setMotivoFilter] = useState("ALL");
  const [protocolFilter, setProtocolFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");

  const { data: motoristas = [] } = useQuery<CadastroPessoa[]>({
    queryKey: ["motoristas"],
    queryFn: () => customFetch<CadastroPessoa[]>("/api/motoristas"),
  });
  const { data: conferentes = [] } = useQuery<CadastroPessoa[]>({
    queryKey: ["conferentes"],
    queryFn: () => customFetch<CadastroPessoa[]>("/api/conferentes"),
  });

  const historyParams = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      operation,
      motorista: motoristaFilter === "ALL" ? undefined : motoristaFilter,
      motivo: motivoFilter === "ALL" ? undefined : motivoFilter,
      protocolo: protocolFilter || undefined,
      code: codeFilter || undefined,
      status:
        statusFilter === "ALL"
          ? undefined
          : (statusFilter as "RASCUNHO" | "EMITIDO" | "CANCELADO"),
    }),
    [codeFilter, dateFrom, dateTo, motoristaFilter, motivoFilter, operation, protocolFilter, statusFilter],
  );

  const { data: protocols = [], isLoading: historyLoading } =
    useListReturnProtocols(historyParams);

  const effectiveReason = motivo === "Outros" ? motivoOutro.trim() : motivo;

  const addPackage = async () => {
    const code = trackingInput.trim();
    if (!code) return;
    if (items.some((item) => item.referencia.toLowerCase() === code.toLowerCase())) {
      toast({ title: "Código já adicionado", variant: "destructive" });
      return;
    }

    setLookingUp(true);
    try {
      const pkg = await customFetch<PacoteLocal>(
        `/api/packages/lookup?trackingNumber=${encodeURIComponent(code)}&operation=${encodeURIComponent(operation)}`,
      );
      setItems((current) => [
        ...current,
        {
          tipo: "RASTREAVEL",
          referencia: pkg.trackingNumber,
          descricao: "Pacote localizado no cadastro local",
          operacao: pkg.operation,
          cidade: pkg.city,
          rota: "",
          prazo: pkg.promisedDeliveryDate ?? "",
          quantidadeVolumes: 1,
          observacao: "",
          origem: "local",
        },
      ]);
      toast({ title: "Pacote localizado no cadastro local" });
      setTrackingInput("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setItems((current) => [
          ...current,
          {
            tipo: "MANUAL",
            referencia: code,
            descricao: "",
            operacao: operation,
            cidade: "",
            rota: "",
            prazo: "",
            quantidadeVolumes: 1,
            observacao: "",
            origem: "manual",
          },
        ]);
        toast({
          title: "Sem rastreabilidade",
          description: "Preencha os dados manuais do pacote.",
        });
        setTrackingInput("");
      } else {
        toast({
          title: "Erro ao consultar pacote",
          description: error instanceof Error ? error.message : "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLookingUp(false);
    }
  };

  const updateItem = <K extends keyof ReturnProtocolItemInput>(
    index: number,
    field: K,
    value: ReturnProtocolItemInput[K],
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const resetForm = () => {
    setDataDevolucao(getTodayDateString());
    setMotorista("");
    setConferente("");
    setMotivo("");
    setMotivoOutro("");
    setObservacoes("");
    setTrackingInput("");
    setItems([]);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      customFetch<ReturnProtocol>("/api/return-protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operacao: operation,
          motorista,
          conferente,
          dataDevolucao,
          motivo: effectiveReason,
          observacoes,
          items: items.map(({ origem: _origem, ...item }) => item),
        }),
      }),
    onSuccess: (protocol) => {
      setLastCreated(protocol);
      setSelected(protocol);
      resetForm();
      queryClient.invalidateQueries({ queryKey: getListReturnProtocolsQueryKey() });
      toast({
        title: "Protocolo emitido",
        description: protocolNumber(protocol),
      });
    },
    onError: (error) => {
      toast({
        title: "Não foi possível emitir o protocolo",
        description: error instanceof Error ? error.message : "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ protocol, reason }: { protocol: ReturnProtocol; reason: string }) =>
      customFetch<ReturnProtocol>(`/api/return-protocols/${protocol.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: reason }),
      }),
    onSuccess: (protocol) => {
      setSelected((current) => (current?.id === protocol.id ? protocol : current));
      setCancelTarget(null);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: getListReturnProtocolsQueryKey() });
      toast({ title: "Protocolo cancelado" });
    },
    onError: (error) => {
      toast({
        title: "Não foi possível cancelar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    dataDevolucao &&
    motorista &&
    conferente &&
    effectiveReason &&
    items.length > 0 &&
    items.every((item) => item.referencia.trim() && item.quantidadeVolumes >= 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Protocolos de Devolução</h1>
        <p className="mt-2 text-muted-foreground">
          Registre devoluções com dados do cadastro local ou itens sem rastreabilidade.
        </p>
      </div>

      {lastCreated && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-primary-foreground/90">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">{protocolNumber(lastCreated)} emitido com sucesso.</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-primary/30 bg-background text-foreground"
            onClick={() => exportProtocolPdf(lastCreated)}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Baixar duas vias
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Novo protocolo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Data da devolução</label>
              <Input type="date" value={dataDevolucao} onChange={(e) => setDataDevolucao(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Motorista</label>
              <Select value={motorista} onValueChange={setMotorista}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {motoristas.map((person) => (
                    <SelectItem key={person.id} value={person.nome}>{person.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Conferente</label>
              <Select value={conferente} onValueChange={setConferente}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {conferentes.map((person) => (
                    <SelectItem key={person.id} value={person.nome}>{person.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Motivo</label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {motivo === "Outros" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Descreva o motivo</label>
              <Input value={motivoOutro} onChange={(e) => setMotivoOutro(e.target.value)} />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">Digite ou bipe o código</label>
            <div className="flex gap-2">
              <Input
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPackage();
                  }
                }}
                placeholder="Código de rastreio ou referência"
                autoFocus
              />
              <Button type="button" onClick={addPackage} disabled={lookingUp || !trackingInput.trim()}>
                {lookingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                Adicionar
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              A consulta é feita somente no cadastro local. Códigos não encontrados são abertos para preenchimento manual.
            </p>
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum pacote adicionado.
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={`${item.referencia}-${index}`}
                  className={`rounded-lg border p-4 ${item.origem === "manual" ? "border-amber-300 bg-amber-50/60" : "border-primary/20 bg-primary/5"}`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {item.origem === "manual" ? (
                      <Badge className="bg-amber-600 hover:bg-amber-600">Sem rastreabilidade</Badge>
                    ) : (
                      <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">Cadastro local</Badge>
                    )}
                    <span className="font-mono text-sm font-semibold">{item.referencia}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto text-destructive"
                      onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {item.origem === "manual" ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium">Identificação / referência</label>
                        <Input value={item.referencia} onChange={(e) => updateItem(index, "referencia", e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Descrição</label>
                        <Input value={item.descricao ?? ""} onChange={(e) => updateItem(index, "descricao", e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Operação</label>
                        <Input value={item.operacao ?? ""} onChange={(e) => updateItem(index, "operacao", e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Cidade</label>
                        <Input value={item.cidade ?? ""} onChange={(e) => updateItem(index, "cidade", e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Rota</label>
                        <Input value={item.rota ?? ""} onChange={(e) => updateItem(index, "rota", e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Prazo</label>
                        <Input type="date" value={item.prazo ?? ""} onChange={(e) => updateItem(index, "prazo", e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Quantidade de volumes</label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantidadeVolumes}
                          onChange={(e) => updateItem(index, "quantidadeVolumes", Math.max(1, Number(e.target.value) || 1))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Observação</label>
                        <Input value={item.observacao ?? ""} onChange={(e) => updateItem(index, "observacao", e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 text-sm sm:grid-cols-4">
                      <div><span className="text-muted-foreground">Operação</span><p className="font-medium">{item.operacao}</p></div>
                      <div><span className="text-muted-foreground">Cidade</span><p className="font-medium">{item.cidade || "—"}</p></div>
                      <div><span className="text-muted-foreground">Prazo</span><p className="font-medium">{formatDate(item.prazo ?? "")}</p></div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Volumes</label>
                        <Input
                          className="h-8 w-24"
                          type="number"
                          min={1}
                          value={item.quantidadeVolumes}
                          onChange={(e) => updateItem(index, "quantidadeVolumes", Math.max(1, Number(e.target.value) || 1))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Observações gerais</label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais para constar nas duas vias"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={resetForm} disabled={createMutation.isPending}>Limpar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emitir protocolo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div><label className="mb-1 block text-xs text-muted-foreground">De</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div><label className="mb-1 block text-xs text-muted-foreground">Até</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="EMITIDO">Emitido</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Motorista</label>
              <Select value={motoristaFilter} onValueChange={setMotoristaFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {motoristas.map((person) => <SelectItem key={person.id} value={person.nome}>{person.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Motivo</label>
              <Select value={motivoFilter} onValueChange={setMotivoFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {MOTIVOS.filter((item) => item !== "Outros").map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><label className="mb-1 block text-xs text-muted-foreground">Protocolo</label><Input value={protocolFilter} onChange={(e) => setProtocolFilter(e.target.value)} placeholder="DEV-..." /></div>
            <div><label className="mb-1 block text-xs text-muted-foreground">Código</label><Input value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} placeholder="Rastreio/ref." /></div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Conferente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                ) : protocols.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhum protocolo encontrado.</TableCell></TableRow>
                ) : (
                  protocols.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell className="font-mono font-medium">{protocolNumber(protocol)}</TableCell>
                      <TableCell>{formatDate(protocol.dataDevolucao)}</TableCell>
                      <TableCell>{protocol.motorista}</TableCell>
                      <TableCell>{protocol.conferente}</TableCell>
                      <TableCell>{protocol.motivo}</TableCell>
                      <TableCell>{protocol.items.length}</TableCell>
                      <TableCell>{statusBadge(protocol.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Visualizar" onClick={() => setSelected(protocol)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Baixar PDF" onClick={() => exportProtocolPdf(protocol)}><FileDown className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {protocolNumber(selected)} {statusBadge(selected.status)}
                </DialogTitle>
                <DialogDescription>
                  Emitido em {formatDate(selected.dataDevolucao)} para {selected.motorista}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><span className="text-muted-foreground">Operação</span><p className="font-medium">{selected.operacao}</p></div>
                <div><span className="text-muted-foreground">Conferente</span><p className="font-medium">{selected.conferente}</p></div>
                <div><span className="text-muted-foreground">Motivo</span><p className="font-medium">{selected.motivo}</p></div>
                <div><span className="text-muted-foreground">Volumes</span><p className="font-medium">{selected.items.reduce((sum, item) => sum + item.quantidadeVolumes, 0)}</p></div>
              </div>
              {selected.cancelamentoMotivo && (
                <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span><strong>Motivo do cancelamento:</strong> {selected.cancelamentoMotivo}</span>
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead>Referência</TableHead><TableHead>Rastreabilidade</TableHead><TableHead>Operação</TableHead><TableHead>Cidade / rota</TableHead><TableHead>Volumes</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {selected.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.referencia}</TableCell>
                        <TableCell>{item.tipo === "MANUAL" ? <Badge className="bg-amber-600 hover:bg-amber-600">Sem rastreabilidade</Badge> : <Badge variant="secondary">Cadastro local</Badge>}</TableCell>
                        <TableCell>{item.operacao || "—"}</TableCell>
                        <TableCell>{[item.cidade, item.rota].filter(Boolean).join(" / ") || "—"}</TableCell>
                        <TableCell>{item.quantidadeVolumes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selected.observacoes && <p className="text-sm"><strong>Observações:</strong> {selected.observacoes}</p>}
              <DialogFooter>
                {selected.status !== "CANCELADO" && (
                  <Button variant="destructive" onClick={() => setCancelTarget(selected)}>
                    <Ban className="mr-2 h-4 w-4" />Cancelar protocolo
                  </Button>
                )}
                <Button onClick={() => exportProtocolPdf(selected)}>
                  <FileDown className="mr-2 h-4 w-4" />Baixar duas vias
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar protocolo</DialogTitle>
            <DialogDescription>
              O documento continuará no histórico e não poderá voltar ao status emitido. Para corrigir dados, emita um novo protocolo.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Motivo do cancelamento</label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={() => cancelTarget && cancelMutation.mutate({ protocol: cancelTarget, reason: cancelReason.trim() })}
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}