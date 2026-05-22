import { useState, useCallback } from "react";
import { customFetch } from "@workspace/api-client-react";
import type { DeliveryManifest, ManifestPreviewItem, CityContact } from "@workspace/api-client-react";
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
import { Loader2, FileDown, Save, RefreshCw, ClipboardList } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface EditableItem extends ManifestPreviewItem {
  responsavel: string;
  contato: string;
}

function formatDateBR(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(val: string | null | undefined): string {
  if (!val) return "";
  return parseFloat(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RomaneioMotorista() {
  const { toast } = useToast();

  const [rota, setRota] = useState<string>("");
  const [data, setData] = useState<string>(getTodayDateString());
  const [motorista, setMotorista] = useState<string>("");
  const [conferente, setConferente] = useState<string>("");
  const [contatoMotorista, setContatoMotorista] = useState<string>("");
  const [rotaPortaAPorta, setRotaPortaAPorta] = useState<number>(0);
  const [valorPagamento, setValorPagamento] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const [items, setItems] = useState<EditableItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedManifest, setSavedManifest] = useState<DeliveryManifest | null>(null);

  const selectedRoute = ROUTES.find((r) => r.name === rota);

  const loadPreview = useCallback(async () => {
    if (!selectedRoute || !data) return;
    setLoadingPreview(true);
    try {
      const cities = selectedRoute.cities.join(",");
      const [preview, contacts] = await Promise.all([
        customFetch<ManifestPreviewItem[]>(
          `/api/delivery-manifests/preview?cities=${encodeURIComponent(cities)}&date=${data}`
        ),
        customFetch<CityContact[]>("/api/city-contacts"),
      ]);

      const contactMap = new Map<string, CityContact>(
        contacts.map((c) => [c.city.toLowerCase(), c])
      );

      // Build editable items, try to find contact for each unique city
      const editableItems: EditableItem[] = preview.map((p) => {
        const contact = contactMap.get(p.cidade.toLowerCase());
        return {
          ...p,
          responsavel: contact?.responsavel ?? "",
          contato: contact?.contato ?? "",
        };
      });

      setItems(editableItems);
      setSavedManifest(null);

      if (editableItems.length === 0) {
        toast({
          title: "Nenhum volume encontrado",
          description: "Não há bipagens para essa rota na data selecionada.",
        });
      }
    } catch {
      toast({ title: "Erro ao carregar preview", variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedRoute, data, toast]);

  function updateItem(index: number, field: keyof EditableItem, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as EditableItem;
      return next;
    });
  }

  async function handleSave() {
    if (!motorista || !conferente || !rota || items.length === 0) {
      toast({ title: "Preencha motorista, conferente, rota e carregue os volumes.", variant: "destructive" });
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
          valorPagamento: valorPagamento ? parseFloat(valorPagamento.replace(",", ".")) : null,
          observacoes: observacoes || null,
          items,
        }),
      });
      setSavedManifest(manifest);
      toast({ title: `Romaneio Nº ${manifest.numero} salvo com sucesso!` });
    } catch {
      toast({ title: "Erro ao salvar romaneio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleExportPDF(manifest?: DeliveryManifest | null) {
    const numero = manifest?.numero ?? savedManifest?.numero ?? "—";
    const now = new Date();
    const dataFormatada = formatDateBR(data);
    const horaFormatada = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 8;

    // ── HEADER ──
    doc.setFillColor(15, 40, 80);
    doc.rect(0, 0, W, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("ROMANEIO DE ENTREGA", W / 2, 8, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Nº: ${numero}`, W - margin, 8, { align: "right" });

    // ── INFO BLOCK ──
    doc.setFillColor(240, 244, 250);
    doc.rect(0, 13, W, 20, "F");
    doc.setTextColor(15, 40, 80);
    doc.setFontSize(8.5);

    const col1 = margin;
    const col2 = W * 0.28;
    const col3 = W * 0.56;
    const col4 = W * 0.78;
    const row1 = 19;
    const row2 = 27;

    doc.setFont("helvetica", "bold");
    doc.text("DATA:", col1, row1);
    doc.setFont("helvetica", "normal");
    doc.text(dataFormatada, col1 + 14, row1);

    doc.setFont("helvetica", "bold");
    doc.text("HORA:", col1, row2);
    doc.setFont("helvetica", "normal");
    doc.text(horaFormatada, col1 + 14, row2);

    doc.setFont("helvetica", "bold");
    doc.text("CONFERENTE:", col2, row1);
    doc.setFont("helvetica", "normal");
    doc.text(conferente.toUpperCase(), col2 + 28, row1);

    doc.setFont("helvetica", "bold");
    doc.text("MOTORISTA:", col2, row2);
    doc.setFont("helvetica", "normal");
    doc.text(motorista.toUpperCase(), col2 + 26, row2);

    doc.setFont("helvetica", "bold");
    doc.text("CONTATO:", col3, row1);
    doc.setFont("helvetica", "normal");
    doc.text(contatoMotorista || "( ) -", col3 + 22, row1);

    doc.setFont("helvetica", "bold");
    doc.text("ROTA PORTA A PORTA:", col3, row2);
    doc.setFont("helvetica", "normal");
    doc.text(String(rotaPortaAPorta), col3 + 49, row2);

    doc.setFont("helvetica", "bold");
    doc.text("ROTA:", col4, row1);
    doc.setFont("helvetica", "normal");
    doc.text(rota, col4 + 14, row1, { maxWidth: W - col4 - 14 - margin });

    // ── TABLE ──
    const tableRows = items.map((it) => [
      it.empresa,
      it.sacas > 0 ? String(it.sacas) : "",
      it.avulsos > 0 ? String(it.avulsos) : "",
      String(it.sacas + it.avulsos),
      it.cidade.toUpperCase(),
      it.responsavel.toUpperCase(),
      it.contato,
      "",
    ]);

    // Add empty rows to pad
    while (tableRows.length < 22) {
      tableRows.push(["", "", "", "", "", "", "", ""]);
    }

    autoTable(doc, {
      startY: 35,
      head: [["EMPRESA", "SACAS", "AVULSOS", "TOTAL", "CIDADES", "RESPONSÁVEL RECEBIMENTO", "CONTATO", "ASSINATURA DO ENTREGADOR"]],
      body: tableRows,
      margin: { left: margin, right: margin },
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

    // Totals row
    const totalSacas = items.reduce((s, i) => s + i.sacas, 0);
    const totalAvulsos = items.reduce((s, i) => s + i.avulsos, 0);
    const totalGeral = totalSacas + totalAvulsos;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 40, 80);
    doc.text(`TOTAL GERAL: ${totalGeral} volumes  (${totalSacas} sacas + ${totalAvulsos} avulsos)`, margin, finalY + 6);

    if (valorPagamento) {
      doc.text(
        `VALOR MOTORISTA: ${formatCurrency(valorPagamento)}`,
        W - margin,
        finalY + 6,
        { align: "right" }
      );
    }

    // ── FOOTER ──
    const footerY = H - 12;
    doc.setDrawColor(15, 40, 80);
    doc.setLineWidth(0.4);

    doc.line(margin, footerY, margin + 70, footerY);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("ASSINATURA CONFERENTE", margin + 35, footerY + 4, { align: "center" });

    doc.line(W - margin - 70, footerY, W - margin, footerY);
    doc.text("ASSINATURA MOTORISTA", W - margin - 35, footerY + 4, { align: "center" });

    doc.save(`romaneio-motorista-${numero}-${data}.pdf`);
  }

  const totalSacas = items.reduce((s, i) => s + i.sacas, 0);
  const totalAvulsos = items.reduce((s, i) => s + i.avulsos, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Romaneio Motorista</h1>
        <p className="text-muted-foreground mt-2">
          Crie e exporte o romaneio de entrega por motorista.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form ── */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Dados do Romaneio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rota *</label>
              <Select value={rota} onValueChange={(v) => { setRota(v); setItems([]); setSavedManifest(null); }}>
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
              <Input
                type="date"
                value={data}
                onChange={(e) => { setData(e.target.value); setItems([]); setSavedManifest(null); }}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Motorista *</label>
              <Input
                placeholder="Nome do motorista"
                value={motorista}
                onChange={(e) => setMotorista(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conferente *</label>
              <Input
                placeholder="Nome do conferente"
                value={conferente}
                onChange={(e) => setConferente(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contato do Motorista</label>
              <Input
                placeholder="(XX) XXXXX-XXXX"
                value={contatoMotorista}
                onChange={(e) => setContatoMotorista(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rota Porta a Porta</label>
              <Input
                type="number"
                min={0}
                value={rotaPortaAPorta}
                onChange={(e) => setRotaPortaAPorta(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor do Pagamento (R$)</label>
              <Input
                placeholder="0,00"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <Textarea
                placeholder="Observações opcionais..."
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={loadPreview}
              disabled={!rota || !data || loadingPreview}
            >
              {loadingPreview ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Carregar Volumes</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Items table ── */}
        <div className="lg:col-span-2 space-y-4">
          {items.length > 0 && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-sm">
                    {totalSacas + totalAvulsos} volumes
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {totalSacas} sacas
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {totalAvulsos} avulsos
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExportPDF(savedManifest)}>
                    <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" /> Salvar Romaneio</>
                    )}
                  </Button>
                </div>
              </div>

              {savedManifest && (
                <div className="flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                  <span className="font-semibold">Romaneio Nº {savedManifest.numero} salvo.</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => handleExportPDF(savedManifest)}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> Baixar PDF
                  </Button>
                </div>
              )}

              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[90px]">Empresa</TableHead>
                        <TableHead className="w-[70px] text-center">Sacas</TableHead>
                        <TableHead className="w-[70px] text-center">Avulsos</TableHead>
                        <TableHead className="w-[70px] text-center">Total</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Contato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant={item.empresa === "AMAZON" ? "default" : "secondary"}>
                              {item.empresa}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="w-16 text-center h-8"
                              value={item.sacas}
                              onChange={(e) => updateItem(idx, "sacas", parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="w-16 text-center h-8"
                              value={item.avulsos}
                              onChange={(e) => updateItem(idx, "avulsos", parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {item.sacas + item.avulsos}
                          </TableCell>
                          <TableCell className="font-medium">{item.cidade}</TableCell>
                          <TableCell>
                            <Input
                              className="h-8 min-w-[160px]"
                              placeholder="Nome do responsável"
                              value={item.responsavel}
                              onChange={(e) => updateItem(idx, "responsavel", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 min-w-[130px]"
                              placeholder="(XX) XXXXX-XXXX"
                              value={item.contato}
                              onChange={(e) => updateItem(idx, "contato", e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}

          {items.length === 0 && !loadingPreview && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">Nenhum volume carregado</p>
                <p className="text-sm mt-1">
                  Selecione a rota e a data, depois clique em <strong>Carregar Volumes</strong>.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
