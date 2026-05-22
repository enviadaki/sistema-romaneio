import { useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";
import type { DeliveryManifest, CityContact } from "@workspace/api-client-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  FileDown,
  Save,
  Plus,
  Trash2,
  ClipboardList,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ManualItem {
  empresa: string;
  sacas: number;
  avulsos: number;
  cidade: string;
  responsavel: string;
  contato: string;
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

export default function RomaneioMotorista() {
  const { toast } = useToast();

  // Header fields
  const [rota, setRota] = useState("");
  const [data, setData] = useState(getTodayDateString());
  const [motorista, setMotorista] = useState("");
  const [conferente, setConferente] = useState("");
  const [contatoMotorista, setContatoMotorista] = useState("");
  const [rotaPortaAPorta, setRotaPortaAPorta] = useState(0);
  const [km, setKm] = useState("");
  const [valorPorKm, setValorPorKm] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Derived payment value
  const valorPagamento = parseDec(km) * parseDec(valorPorKm);

  // Manual rows
  const [items, setItems] = useState<ManualItem[]>([emptyItem()]);

  // City contacts for auto-fill
  const { data: cityContacts = [] } = useQuery<CityContact[]>({
    queryKey: ["city-contacts"],
    queryFn: () => customFetch<CityContact[]>("/api/city-contacts"),
  });
  const contactMap = new Map(cityContacts.map((c) => [c.city.toLowerCase(), c]));

  const [saving, setSaving] = useState(false);
  const [savedManifest, setSavedManifest] = useState<DeliveryManifest | null>(null);

  // Auto-fill responsavel/contato when cidade changes
  function handleCidadeChange(index: number, cidade: string) {
    const contact = contactMap.get(cidade.toLowerCase());
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        cidade,
        responsavel: contact?.responsavel ?? next[index].responsavel,
        contato: contact?.contato ?? next[index].contato,
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
  }

  async function handleSave() {
    if (!motorista || !conferente || !rota) {
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
          motorista,
          conferente,
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
      toast({ title: `Romaneio Nº ${manifest.numero} salvo!` });
    } catch {
      toast({ title: "Erro ao salvar romaneio.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleExportPDF() {
    const numero = savedManifest?.numero ?? "RASCUNHO";
    const now = new Date();
    const horaFormatada = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const validItems = items.filter((it) => it.cidade.trim() !== "");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const mg = 8;

    // Header bar
    doc.setFillColor(15, 40, 80);
    doc.rect(0, 0, W, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("ROMANEIO DE ENTREGA", W / 2, 8, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Nº: ${numero}`, W - mg, 8, { align: "right" });

    // Info block
    doc.setFillColor(240, 244, 250);
    doc.rect(0, 13, W, 22, "F");
    doc.setTextColor(15, 40, 80);
    doc.setFontSize(8.5);

    const c1 = mg, c2 = W * 0.22, c3 = W * 0.45, c4 = W * 0.66, c5 = W * 0.83;
    const r1 = 20, r2 = 29;

    const bf = (label: string, val: string, x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.text(val, x + doc.getTextWidth(label) + 1.5, y);
    };

    bf("DATA:", formatDateBR(data), c1, r1);
    bf("HORA:", horaFormatada, c1, r2);
    bf("CONFERENTE:", conferente.toUpperCase(), c2, r1);
    bf("MOTORISTA:", motorista.toUpperCase(), c2, r2);
    bf("CONTATO:", contatoMotorista || "( ) -", c3, r1);
    bf("ROTA PORTA A PORTA:", String(rotaPortaAPorta), c3, r2);
    bf("KM:", km || "0", c4, r1);
    bf("VALOR/KM:", `R$ ${parseDec(valorPorKm).toFixed(4).replace(".", ",")}`, c4, r2);
    bf("VALOR MOTORISTA:", valorPagamento > 0 ? formatBRL(valorPagamento) : "—", c5, r1);
    bf("ROTA:", rota, c5, r2, );

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
      startY: 37,
      head: [["EMPRESA", "SACAS", "AVULSOS", "TOTAL", "CIDADES", "RESPONSÁVEL RECEBIMENTO", "CONTATO", "ASSINATURA DO ENTREGADOR"]],
      body: tableRows,
      margin: { left: mg, right: mg },
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.5, valign: "middle" },
      headStyles: {
        fillColor: [15, 40, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: 7,
      },
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

    // Totals summary
    const ts = validItems.reduce((s, i) => s + i.sacas, 0);
    const ta = validItems.reduce((s, i) => s + i.avulsos, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 40, 80);
    doc.text(`TOTAL: ${ts + ta} volumes  (${ts} sacas + ${ta} avulsos)`, mg, finalY + 6);
    if (km) {
      doc.text(`${km} km × R$ ${parseDec(valorPorKm).toFixed(4).replace(".", ",")} = ${formatBRL(valorPagamento)}`, W - mg, finalY + 6, { align: "right" });
    }

    // Footer signatures
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

  // Totals
  const validItems = items.filter((it) => it.cidade.trim() !== "");
  const totalSacas = validItems.reduce((s, i) => s + i.sacas, 0);
  const totalAvulsos = validItems.reduce((s, i) => s + i.avulsos, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Romaneio Motorista</h1>
        <p className="text-muted-foreground mt-2">Preencha manualmente os dados e gere o romaneio de entrega.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        {/* ── Dados do cabeçalho ── */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Dados do Romaneio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data *</label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Motorista *</label>
              <Input placeholder="Nome do motorista" value={motorista} onChange={(e) => setMotorista(e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conferente *</label>
              <Input placeholder="Nome do conferente" value={conferente} onChange={(e) => setConferente(e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contato do Motorista</label>
              <Input placeholder="(XX) XXXXX-XXXX" value={contatoMotorista} onChange={(e) => setContatoMotorista(e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rota Porta a Porta</label>
              <Input
                type="number" min={0}
                value={rotaPortaAPorta}
                onChange={(e) => setRotaPortaAPorta(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* KM + Valor/km */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cálculo de Pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Quilômetros (km)</label>
                  <Input
                    placeholder="0"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Valor por km (R$)</label>
                  <Input
                    placeholder="0,0000"
                    value={valorPorKm}
                    onChange={(e) => setValorPorKm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Valor total motorista</span>
                <span className="text-base font-bold text-primary">
                  {valorPagamento > 0 ? formatBRL(valorPagamento) : "—"}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <Textarea placeholder="Observações opcionais..." rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* ── Tabela manual de itens ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-sm">
                {totalSacas + totalAvulsos} volumes
              </Badge>
              {totalSacas > 0 && <Badge variant="secondary">{totalSacas} sacas</Badge>}
              {totalAvulsos > 0 && <Badge variant="secondary">{totalAvulsos} avulsos</Badge>}
              <Badge variant="secondary">{validItems.length} {validItems.length === 1 ? "cidade" : "cidades"}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" /> PDF
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar</>}
              </Button>
            </div>
          </div>

          {savedManifest && (
            <div className="flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
              <span className="font-semibold">Romaneio Nº {savedManifest.numero} salvo.</span>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => { setSavedManifest(null); resetForm(); }}>
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
                    <TableHead className="min-w-[140px]">Cidade</TableHead>
                    <TableHead className="min-w-[180px]">Responsável</TableHead>
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
                            <SelectItem value="LOGGI">LOGGI</SelectItem>
                            <SelectItem value="AMAZON">AMAZON</SelectItem>
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
                        <Input
                          className="h-8"
                          placeholder="Cidade"
                          value={item.cidade}
                          onChange={(e) => handleCidadeChange(idx, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-8"
                          placeholder="Nome do responsável"
                          value={item.responsavel}
                          onChange={(e) => updateItem(idx, "responsavel", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="px-1">
                        <Input
                          className="h-8"
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
                <Plus className="h-4 w-4 mr-2" /> Adicionar Linha
              </Button>
            </div>
          </Card>

          {validItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground text-sm">
              <ClipboardList className="h-8 w-8 mb-2 opacity-30" />
              <p>Preencha ao menos uma cidade na tabela acima.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
