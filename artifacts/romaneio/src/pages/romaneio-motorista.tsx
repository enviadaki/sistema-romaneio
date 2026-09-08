import { useState, useMemo } from "react";
import { customFetch } from "@workspace/api-client-react";
import type { DeliveryManifest, CityContact, Motorista, Conferente } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "@/lib/routes-data";
import { getTodayDateString } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileDown, Save, Plus, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
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

const OPERACOES = ["LOGGI", "AMAZON", "SHOPEE", "IMILE"];
const CONFERENTES_ADICIONAIS = ["Vitor", "Marcelo"];

interface ManualItem {
  empresa: string;
  sacas: number;
  avulsos: number;
  cidade: string;
  responsavel: string;
  contato: string;
}

interface RegisteredCity {
  id: number;
  name: string;
}

function emptyItem(): ManualItem {
  return { empresa: "LOGGI", sacas: 0, avulsos: 0, cidade: "", responsavel: "", contato: "" };
}

function parseDec(val: string): number {
  return parseFloat(val.replace(",", ".")) || 0;
}

function formatBRL(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Combobox de cidade com busca
function CidadeCombobox({
  value,
  onChange,
  cities,
}: {
  value: string;
  onChange: (v: string) => void;
  cities: RegisteredCity[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-8 w-full justify-between font-normal text-xs px-2"
        >
          <span className="truncate">{value || "Cidade..."}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cidade..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
            <CommandGroup>
              {cities.map((city) => (
                <CommandItem
                  key={city.id}
                  value={city.name}
                  onSelect={(val) => {
                    onChange(val.toUpperCase());
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check className={cn("mr-2 h-3 w-3", value === city.name ? "opacity-100" : "opacity-0")} />
                  {city.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function RomaneioMotorista() {
  const { toast } = useToast();

  // ── Dados de referência do BD ──────────────────────────────────────────────
  const { data: motoristas = [] } = useQuery<Motorista[]>({
    queryKey: ["motoristas"],
    queryFn: () => customFetch<Motorista[]>("/api/motoristas"),
  });
  const { data: conferentes = [] } = useQuery<Conferente[]>({
    queryKey: ["conferentes"],
    queryFn: () => customFetch<Conferente[]>("/api/conferentes"),
  });
  const { data: cityContacts = [] } = useQuery<CityContact[]>({
    queryKey: ["city-contacts"],
    queryFn: () => customFetch<CityContact[]>("/api/city-contacts"),
  });
  const { data: registeredCities = [] } = useQuery<RegisteredCity[]>({
    queryKey: ["admin-cities"],
    queryFn: () => customFetch<RegisteredCity[]>("/api/admin/cities"),
  });
  const conferenteOptions = useMemo(() => {
    const existingNames = new Set(conferentes.map((conferente) => conferente.nome.toLowerCase()));
    const additional = CONFERENTES_ADICIONAIS
      .filter((nome) => !existingNames.has(nome.toLowerCase()))
      .map((nome, index) => ({ id: `additional-${index}`, nome }));
    return [...conferentes, ...additional];
  }, [conferentes]);

  const contactMap = useMemo(
    () => new Map(cityContacts.map((c) => [c.city.toUpperCase(), c])),
    [cityContacts]
  );
  const motoristaMap = useMemo(
    () => new Map(motoristas.map((m) => [m.nome, m])),
    [motoristas]
  );

  // ── Campos do cabeçalho ────────────────────────────────────────────────────
  const [rota, setRota] = useState("");
  const [data, setData] = useState(getTodayDateString());
  const [motoristaSelected, setMotoristaSelected] = useState("");
  const [contatoMotorista, setContatoMotorista] = useState("");
  const [conferenteSelected, setConferenteSelected] = useState("");
  const [rotaPortaAPorta, setRotaPortaAPorta] = useState(0);
  const [km, setKm] = useState("");
  const [valorPorKm, setValorPorKm] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const valorPagamento = parseDec(km) * parseDec(valorPorKm);

  // ── Linhas manuais ────────────────────────────────────────────────────────
  const [items, setItems] = useState<ManualItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [savedManifest, setSavedManifest] = useState<DeliveryManifest | null>(null);

  // Seleciona motorista → auto-preenche contato
  function handleMotoristaChange(nome: string) {
    setMotoristaSelected(nome);
    const m = motoristaMap.get(nome);
    if (m) setContatoMotorista(m.contato);
  }

  // Seleciona cidade → auto-preenche responsavel e contato
  function handleCidadeChange(index: number, cidade: string) {
    const contact = contactMap.get(cidade.toUpperCase());
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        cidade,
        responsavel: contact?.responsavel ?? next[index].responsavel,
        contato: contact?.contato ?? next[index].contato,
        empresa: contact?.operacao && OPERACOES.includes(contact.operacao)
          ? contact.operacao
          : next[index].empresa,
      };
      return next;
    });
  }

  function updateItem<K extends keyof ManualItem>(index: number, field: K, value: ManualItem[K]) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addRow() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setItems([emptyItem()]);
    setSavedManifest(null);
    setMotoristaSelected("");
    setContatoMotorista("");
    setConferenteSelected("");
    setRota("");
    setKm("");
    setValorPorKm("");
    setObservacoes("");
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!motoristaSelected || !conferenteSelected || !rota) {
      toast({ title: "Preencha motorista, conferente e rota.", variant: "destructive" });
      return;
    }
    const validItems = items.filter((it) => it.cidade.trim() !== "");
    if (validItems.length === 0) {
      toast({ title: "Adicione ao menos uma cidade.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const manifest = await customFetch<DeliveryManifest>("/api/delivery-manifests", {
        method: "POST",
        body: JSON.stringify({
          motorista: motoristaSelected,
          conferente: conferenteSelected,
          contatoMotorista,
          rota,
          rotaPortaAPorta,
          km: parseDec(km) || null,
          valorPorKm: parseDec(valorPorKm) || null,
          valorPagamento: valorPagamento > 0 ? valorPagamento : null,
          observacoes: observacoes || null,
          items: validItems,
        }),
      });
      setSavedManifest(manifest);
      toast({ title: `Romaneio Nº ${manifest.numero} salvo com sucesso!` });
    } catch {
      toast({ title: "Erro ao salvar romaneio.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // ── Exportar PDF ──────────────────────────────────────────────────────────
  async function handleExportPDF() {
    const numero = savedManifest?.numero ?? "RASCUNHO";
    const horaFormatada = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const validItems = items.filter((it) => it.cidade.trim() !== "");

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
    bf("DATA:", formatDateBR(data), c1, r1);
    bf("HORA:", horaFormatada, c1, r2);
    bf("CONFERENTE:", conferenteSelected.toUpperCase(), c2, r1);
    bf("MOTORISTA:", motoristaSelected.toUpperCase(), c2, r2);
    bf("CONTATO:", contatoMotorista || "( ) -", c3, r1);
    bf("ROTA PORTA A PORTA:", String(rotaPortaAPorta), c3, r2);
    bf("KM:", km || "0", c4, r1);
    bf("VALOR/KM:", `R$ ${parseDec(valorPorKm).toFixed(4).replace(".", ",")}`, c4, r2);
    bf("VALOR MOTORISTA:", valorPagamento > 0 ? formatBRL(valorPagamento) : "—", c5, r1);
    bf("ROTA:", rota, c5, r2);

    // Table
    const tableRows = validItems.map((it) => [
      it.empresa,
      it.sacas > 0 ? String(it.sacas) : "",
      it.avulsos > 0 ? String(it.avulsos) : "",
      String(it.sacas + it.avulsos),
      it.cidade.toUpperCase(),
      it.responsavel.toUpperCase(),
      it.contato,
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
    const ts = validItems.reduce((s, i) => s + i.sacas, 0);
    const ta = validItems.reduce((s, i) => s + i.avulsos, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 40, 80);
    doc.text(`TOTAL: ${ts + ta} volumes  (${ts} sacas + ${ta} avulsos)`, mg, finalY + 6);
    if (km) {
      doc.text(`${km} km × R$ ${parseDec(valorPorKm).toFixed(4).replace(".", ",")} = ${formatBRL(valorPagamento)}`, W - mg, finalY + 6, { align: "right" });
    }
    if (operacaoBreakdown.length > 0) {
      const breakdownText = operacaoBreakdown
        .map((op) => `${op.empresa}: ${formatBRL(op.valor)} (${(op.percentual * 100).toFixed(0)}%)`)
        .join("   |   ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 40, 80);
      doc.text(`DIVISÃO DO FRETE POR OPERAÇÃO: ${breakdownText}`, mg, finalY + 11);
    }

    // Observações em destaque
    const observacaoTexto = observacoes.trim();
    if (observacaoTexto) {
      // A tabela usa 208 mm de largura fixa, deixando uma coluna livre à direita.
      // Usamos essa área para manter as observações na mesma página do romaneio.
      const tableWidth = 208;
      let obsX = mg + tableWidth + 6;
      let obsWidth = W - obsX - mg;
      let obsLines = doc.splitTextToSize(observacaoTexto, obsWidth - 10);
      const obsLineHeight = 4.5;
      const obsTopPadding = 13;
      let obsHeight = Math.max(42, obsTopPadding + obsLines.length * obsLineHeight + 4);
      let obsY = 39;
      const maxObsHeight = H - 25 - obsY;

      // Textos muito longos continuam protegidos: só criamos uma página extra
      // quando não couberem nem mesmo na coluna lateral acima das assinaturas.
      if (obsHeight > maxObsHeight) {
        doc.addPage();
        obsX = mg;
        obsY = 18;
        obsWidth = W - mg * 2;
        obsLines = doc.splitTextToSize(observacaoTexto, obsWidth - 10);
        obsHeight = Math.max(42, obsTopPadding + obsLines.length * obsLineHeight + 4);
      }

      doc.setFillColor(255, 248, 220);
      doc.setDrawColor(217, 145, 0);
      doc.setLineWidth(0.8);
      doc.roundedRect(obsX, obsY, obsWidth, obsHeight, 2, 2, "FD");

      doc.setFillColor(217, 145, 0);
      doc.roundedRect(obsX, obsY, obsWidth, 8, 2, 2, "F");
      doc.rect(obsX, obsY + 4, obsWidth, 4, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("OBSERVAÇÕES — ATENÇÃO", obsX + 4, obsY + 5.5);

      doc.setTextColor(75, 55, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(obsLines, obsX + 5, obsY + obsTopPadding, { lineHeightFactor: 1.15 });
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

    doc.save(`romaneio-motorista-${numero}-${data}.pdf`);
  }

  const validItems = items.filter((it) => it.cidade.trim() !== "");
  const totalSacas = validItems.reduce((s, i) => s + i.sacas, 0);
  const totalAvulsos = validItems.reduce((s, i) => s + i.avulsos, 0);

  // Divisão do valor total do frete entre as operações, proporcional ao volume de cada uma
  const operacaoBreakdown = useMemo(() => {
    const totalVolumes = validItems.reduce((s, i) => s + i.sacas + i.avulsos, 0);
    if (totalVolumes === 0 || valorPagamento <= 0) return [];
    const volumesPorEmpresa = new Map<string, number>();
    for (const it of validItems) {
      const volume = it.sacas + it.avulsos;
      if (volume === 0) continue;
      volumesPorEmpresa.set(it.empresa, (volumesPorEmpresa.get(it.empresa) ?? 0) + volume);
    }
    return Array.from(volumesPorEmpresa.entries())
      .map(([empresa, volume]) => ({
        empresa,
        volume,
        percentual: volume / totalVolumes,
        valor: (volume / totalVolumes) * valorPagamento,
      }))
      .sort((a, b) => b.volume - a.volume);
  }, [validItems, valorPagamento]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Romaneio Motorista</h1>
        <p className="text-muted-foreground mt-2">Preencha os dados e gere o romaneio de entrega.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        {/* ── Painel de dados ── */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Dados do Romaneio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Motorista */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Motorista *</label>
              <Select value={motoristaSelected} onValueChange={handleMotoristaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(70vh,22rem)]">
                  {motoristas.map((m) => (
                    <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contato motorista — preenchido automaticamente, editável */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contato do Motorista</label>
              <Input
                placeholder="Auto-preenchido"
                value={contatoMotorista}
                onChange={(e) => setContatoMotorista(e.target.value)}
              />
            </div>

            {/* Conferente */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conferente *</label>
              <Select value={conferenteSelected} onValueChange={setConferenteSelected}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o conferente" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(70vh,22rem)]">
                  {conferenteOptions.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rota */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rota *</label>
              <Select value={rota} onValueChange={setRota}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a rota" />
                </SelectTrigger>
                <SelectContent>
                  {ROUTES.map((r) => (
                    <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data *</label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>

            {/* Rota porta a porta */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rota Porta a Porta</label>
              <Input
                type="number" min={0}
                value={rotaPortaAPorta}
                onChange={(e) => setRotaPortaAPorta(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Cálculo km */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cálculo de Pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Quilômetros (km)</label>
                  <Input placeholder="0" value={km} onChange={(e) => setKm(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Valor por km (R$)</label>
                  <Input placeholder="0,0000" value={valorPorKm} onChange={(e) => setValorPorKm(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Valor total motorista</span>
                <span className="text-base font-bold text-primary">
                  {valorPagamento > 0 ? formatBRL(valorPagamento) : "—"}
                </span>
              </div>

              {operacaoBreakdown.length > 0 && (
                <div className="space-y-1 pt-1 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Divisão do frete por operação
                  </p>
                  {operacaoBreakdown.map((op) => (
                    <div key={op.empresa} className="flex items-center justify-between text-xs">
                      <span>
                        {op.empresa}{" "}
                        <span className="text-muted-foreground">({(op.percentual * 100).toFixed(0)}%)</span>
                      </span>
                      <span className="font-semibold">{formatBRL(op.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Observações */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <Textarea placeholder="Observações opcionais..." rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* ── Tabela de cidades ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-sm">{totalSacas + totalAvulsos} volumes</Badge>
              {totalSacas > 0 && <Badge variant="secondary">{totalSacas} sacas</Badge>}
              {totalAvulsos > 0 && <Badge variant="secondary">{totalAvulsos} avulsos</Badge>}
              <Badge variant="secondary">{validItems.length} {validItems.length === 1 ? "cidade" : "cidades"}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" /> PDF
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  : <><Save className="h-4 w-4 mr-2" />Salvar</>}
              </Button>
            </div>
          </div>

          {savedManifest && (
            <div className="flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
              <span className="font-semibold">Romaneio Nº {savedManifest.numero} salvo.</span>
              <Button size="sm" variant="outline" className="ml-auto" onClick={resetForm}>
                Novo Romaneio
              </Button>
            </div>
          )}

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Empresa</TableHead>
                    <TableHead className="w-[72px] text-center">Sacas</TableHead>
                    <TableHead className="w-[72px] text-center">Avulsos</TableHead>
                    <TableHead className="w-[60px] text-center">Total</TableHead>
                    <TableHead className="min-w-[180px]">Cidade</TableHead>
                    <TableHead className="min-w-[200px]">Responsável</TableHead>
                    <TableHead className="min-w-[130px]">Contato</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pr-1">
                        <Select value={item.empresa} onValueChange={(v) => updateItem(idx, "empresa", v)}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERACOES.map((op) => (
                              <SelectItem key={op} value={op}>{op}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          type="number" min={0}
                          className="w-16 text-center h-8"
                          value={item.sacas}
                          onChange={(e) => updateItem(idx, "sacas", parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          type="number" min={0}
                          className="w-16 text-center h-8"
                          value={item.avulsos}
                          onChange={(e) => updateItem(idx, "avulsos", parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-center font-semibold text-sm">
                        {item.sacas + item.avulsos}
                      </TableCell>
                      <TableCell className="px-1">
                        <CidadeCombobox
                          value={item.cidade}
                          onChange={(v) => handleCidadeChange(idx, v)}
                          cities={registeredCities}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-8 text-xs"
                          placeholder="Nome do responsável"
                          value={item.responsavel}
                          onChange={(e) => updateItem(idx, "responsavel", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-8 text-xs"
                          placeholder="(XX) XXXXX-XXXX"
                          value={item.contato}
                          onChange={(e) => updateItem(idx, "contato", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="pl-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8"
                          onClick={() => removeRow(idx)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-3 border-t">
              <Button variant="outline" size="sm" onClick={addRow} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Cidade
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
