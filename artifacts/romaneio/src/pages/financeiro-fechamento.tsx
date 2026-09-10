import { useEffect, useMemo, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import type { DeliveryManifest } from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTodayDateString } from "@/lib/date-utils";
import { exportRowsToExcel } from "@/lib/export-xlsx";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FileDown, FileText, Loader2, Save, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MotoristaRow {
  id: number;
  nome: string;
  contato: string;
  chavePix: string;
  favorecido: string;
}

interface DriverSettlement {
  id: number;
  motorista: string;
  competencia: string;
  abastecimento: string;
  totalDesconto: string;
  fechamentoAnterior: string;
  ajudante: string;
  dezPorCentoAMais: string;
  viagem: string;
  saldo: string;
  chavePix: string;
  favorecido: string;
}

interface SettlementRow {
  id: number | null;
  motorista: string;
  abastecimento: string;
  totalDesconto: string;
  fechamentoAnterior: string;
  ajudante: string;
  dezPorCentoAMais: string;
  chavePix: string;
  favorecido: string;
}

// Campos preenchidos manualmente pelo financeiro. "Viagem" e "Saldo" foram
// removidos — o fechamento completo (valores + lista de romaneios do
// período) agora é exportado em PDF pelo botão "Exportar Completo".
const EDITABLE_FIELDS = [
  { key: "abastecimento", label: "Abastecimento" },
  { key: "totalDesconto", label: "Total de Desconto" },
  { key: "fechamentoAnterior", label: "Fechamento Anterior" },
  { key: "ajudante", label: "Ajudante" },
  { key: "dezPorCentoAMais", label: "10% a Mais" },
] as const;

function toDisplay(val: string): string {
  const n = parseFloat(val);
  return Number.isFinite(n) && n !== 0 ? String(n).replace(".", ",") : "";
}

function fromSettlement(s: DriverSettlement): SettlementRow {
  return {
    id: s.id,
    motorista: s.motorista,
    abastecimento: toDisplay(s.abastecimento),
    totalDesconto: toDisplay(s.totalDesconto),
    fechamentoAnterior: toDisplay(s.fechamentoAnterior),
    ajudante: toDisplay(s.ajudante),
    dezPorCentoAMais: toDisplay(s.dezPorCentoAMais),
    chavePix: s.chavePix,
    favorecido: s.favorecido,
  };
}

function parseNum(val: string): number {
  if (!val.trim()) return 0;
  const n = parseFloat(val.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function currentCompetencia(): string {
  return getTodayDateString().slice(0, 7); // "YYYY-MM"
}

// Primeiro e último dia do mês da competência, para buscar os romaneios
// pagos naquele período.
function competenciaRange(competencia: string): { dateFrom: string; dateTo: string } {
  const [yearStr, monthStr] = competencia.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const lastDay = new Date(year, month, 0).getDate();
  return {
    dateFrom: `${competencia}-01`,
    dateTo: `${competencia}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatCurrencyBR(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function getLogoImg() {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    const base = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL;
    img.src = `${base}/enviadaki-logo.png`;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
  });
}

// Fechamento financeiro mensal por motorista — o "Acumulado do Mês" é puxado
// automaticamente a partir dos romaneios pagos na competência; os demais
// campos (abastecimento, descontos, ajudante, 10% a mais) são preenchidos
// manualmente pelo financeiro todo mês. O fechamento completo de cada
// motorista (valores + lista de romaneios do período) pode ser exportado em
// PDF pelo botão "Exportar Completo".
export default function FinanceiroFechamento() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [addMotorista, setAddMotorista] = useState("");

  const { dateFrom, dateTo } = useMemo(() => competenciaRange(competencia), [competencia]);

  const { data: settlementsData, isLoading } = useQuery<DriverSettlement[]>({
    queryKey: ["driver-settlements", competencia],
    queryFn: () => customFetch<DriverSettlement[]>(`/api/driver-settlements?competencia=${competencia}`),
  });

  const { data: motoristasData } = useQuery<MotoristaRow[]>({
    queryKey: ["motoristas-list"],
    queryFn: () => customFetch<MotoristaRow[]>("/api/motoristas"),
  });
  const motoristas = motoristasData ?? [];

  // Romaneios do mês da competência, para calcular o acumulado por motorista
  // e para listar no PDF de "Exportar Completo".
  const { data: manifestsData } = useQuery<DeliveryManifest[]>({
    queryKey: ["delivery-manifests-for-settlement", dateFrom, dateTo],
    queryFn: () => customFetch<DeliveryManifest[]>(`/api/delivery-manifests?dateFrom=${dateFrom}&dateTo=${dateTo}`),
  });
  const manifestsInMonth = manifestsData ?? [];

  const acumuladoPorMotorista = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of manifestsInMonth) {
      const valor = m.valorPagamento ? parseFloat(m.valorPagamento) : 0;
      map.set(m.motorista, (map.get(m.motorista) ?? 0) + valor);
    }
    return map;
  }, [manifestsInMonth]);

  // Sincroniza as linhas locais sempre que a competência muda ou os dados do servidor são recarregados.
  // Importante: depende de `settlementsData` (a referência estável vinda do react-query), nunca de um
  // array com fallback "= []" no destructuring — esse fallback cria um array novo a cada render e,
  // combinado com um useEffect, entra em loop infinito de atualização.
  useEffect(() => {
    if (settlementsData) {
      setRows(settlementsData.map(fromSettlement));
    } else {
      setRows([]);
    }
  }, [settlementsData]);

  const motoristasDisponiveis = useMemo(
    () => motoristas.filter((m) => !rows.some((r) => r.motorista === m.nome)),
    [motoristas, rows]
  );

  function updateField(index: number, field: keyof SettlementRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow(motoristaNome: string) {
    if (!motoristaNome.trim() || rows.some((r) => r.motorista === motoristaNome)) return;
    const cadastro = motoristas.find((m) => m.nome === motoristaNome);
    setRows((prev) => [
      ...prev,
      {
        id: null,
        motorista: motoristaNome,
        abastecimento: "",
        totalDesconto: "",
        fechamentoAnterior: "",
        ajudante: "",
        dezPorCentoAMais: "",
        chavePix: cadastro?.chavePix ?? "",
        favorecido: cadastro?.favorecido ?? "",
      },
    ]);
    setAddMotorista("");
  }

  const saveMutation = useMutation({
    mutationFn: async (row: SettlementRow) => {
      const body = {
        motorista: row.motorista,
        competencia,
        abastecimento: parseNum(row.abastecimento),
        totalDesconto: parseNum(row.totalDesconto),
        fechamentoAnterior: parseNum(row.fechamentoAnterior),
        ajudante: parseNum(row.ajudante),
        dezPorCentoAMais: parseNum(row.dezPorCentoAMais),
        chavePix: row.chavePix.trim(),
        favorecido: row.favorecido.trim(),
      };
      if (row.id) {
        return customFetch<DriverSettlement>(`/api/driver-settlements/${row.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      return customFetch<DriverSettlement>("/api/driver-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-settlements", competencia] });
      toast({ title: "Fechamento salvo" });
    },
    onError: (err: any) => toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customFetch(`/api/driver-settlements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-settlements", competencia] });
      toast({ title: "Fechamento removido" });
    },
    onError: (err: any) => toast({ title: "Erro ao remover", description: err?.message, variant: "destructive" }),
  });

  function removeRow(index: number) {
    const row = rows[index];
    if (row.id) {
      deleteMutation.mutate(row.id);
    } else {
      setRows((prev) => prev.filter((_, i) => i !== index));
    }
  }

  // Gera o PDF de "Exportar Completo": valores do fechamento do motorista +
  // lista dos romaneios dele na competência selecionada.
  async function handleExportCompleto(row: SettlementRow, acumulado: number) {
    const logoImg = await getLogoImg();
    const romaneiosDoMotorista = manifestsInMonth
      .filter((m) => m.motorista === row.motorista)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const mg = 10;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, 16, "F");
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      doc.addImage(logoImg, "PNG", mg, 3, 32, 10);
    }
    doc.setTextColor(20, 30, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("FECHAMENTO MENSAL", W - mg, 9, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Competência ${competencia} (${formatDateBR(dateFrom)} a ${formatDateBR(dateTo)})`, W - mg, 14, { align: "right" });

    doc.setDrawColor(15, 40, 80);
    doc.setLineWidth(0.3);
    doc.line(mg, 18, W - mg, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 40, 80);
    doc.text(row.motorista.toUpperCase(), mg, 26);

    const infoRows: [string, string][] = [
      ["Acumulado do Mês", formatCurrencyBR(acumulado)],
      ["Abastecimento", formatCurrencyBR(parseNum(row.abastecimento))],
      ["Total de Desconto", formatCurrencyBR(parseNum(row.totalDesconto))],
      ["Fechamento Anterior", formatCurrencyBR(parseNum(row.fechamentoAnterior))],
      ["Ajudante", formatCurrencyBR(parseNum(row.ajudante))],
      ["10% a Mais", formatCurrencyBR(parseNum(row.dezPorCentoAMais))],
      ["Chave PIX", row.chavePix || "—"],
      ["Favorecido", row.favorecido || "—"],
    ];

    autoTable(doc, {
      startY: 31,
      body: infoRows,
      margin: { left: mg, right: mg },
      theme: "plain",
      styles: { fontSize: 9.5, cellPadding: 1.2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 55, textColor: [15, 40, 80] },
        1: { cellWidth: 80 },
      },
    });

    const afterInfoY = (doc as any).lastAutoTable?.finalY ?? 60;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 40, 80);
    doc.text(`ROMANEIOS DO PERÍODO (${romaneiosDoMotorista.length})`, mg, afterInfoY + 8);

    const totalVolumesRomaneios = romaneiosDoMotorista.reduce(
      (s, m) => s + m.items.reduce((si, it) => si + it.sacas + it.avulsos, 0),
      0
    );
    const totalValorRomaneios = romaneiosDoMotorista.reduce(
      (s, m) => s + (m.valorPagamento ? parseFloat(m.valorPagamento) : 0),
      0
    );

    const romaneioRows = romaneiosDoMotorista.map((m) => [
      String(m.numero ?? "—"),
      formatDateBR(m.createdAt),
      m.rota,
      String(m.items.reduce((si, it) => si + it.sacas + it.avulsos, 0)),
      m.status,
      m.valorPagamento ? formatCurrencyBR(parseFloat(m.valorPagamento)) : "—",
    ]);

    autoTable(doc, {
      startY: afterInfoY + 12,
      head: [["Nº", "Data", "Rota", "Volumes", "Status", "Valor"]],
      body: romaneioRows.length > 0 ? romaneioRows : [["—", "—", "Nenhum romaneio no período", "—", "—", "—"]],
      foot: [["", "", "TOTAL", String(totalVolumesRomaneios), "", formatCurrencyBR(totalValorRomaneios)]],
      margin: { left: mg, right: mg },
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: [15, 40, 80], textColor: [255, 255, 255], fontStyle: "bold" },
      footStyles: { fillColor: [240, 244, 250], textColor: [15, 40, 80], fontStyle: "bold" },
      columnStyles: {
        0: { halign: "center", cellWidth: 18 },
        1: { halign: "center", cellWidth: 24 },
        3: { halign: "center", cellWidth: 22 },
        4: { halign: "center", cellWidth: 24 },
        5: { halign: "right", cellWidth: 30 },
      },
    });

    doc.save(`fechamento-completo-${slugify(row.motorista)}-${competencia}.pdf`);
  }

  const rowsWithComputed = useMemo(
    () =>
      rows.map((r) => ({ row: r, acumulado: acumuladoPorMotorista.get(r.motorista) ?? 0 })),
    [rows, acumuladoPorMotorista]
  );

  const totals = useMemo(() => {
    const t: Record<string, number> = { acumulado: 0 };
    for (const f of EDITABLE_FIELDS) t[f.key] = 0;
    for (const { row: r, acumulado } of rowsWithComputed) {
      t.acumulado += acumulado;
      for (const f of EDITABLE_FIELDS) t[f.key] += parseNum((r as any)[f.key]);
    }
    return t;
  }, [rowsWithComputed]);

  const colCount = 1 /* motorista */ + 1 /* acumulado */ + EDITABLE_FIELDS.length + 2 /* pix/favorecido */ + 1 /* ações */;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Fechamento Mensal de Motoristas</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Acumulado do mês é calculado automaticamente a partir dos romaneios. Os demais campos são
            preenchidos manualmente. Use "Exportar Completo" para gerar o PDF do fechamento de cada motorista.
          </p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Competência</label>
          <Input
            type="month"
            className="w-[160px]"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Adicionar motorista</label>
          <Select value={addMotorista} onValueChange={(v) => { setAddMotorista(v); addRow(v); }}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Selecione um motorista..." />
            </SelectTrigger>
            <SelectContent>
              {motoristasDisponiveis.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Todos já adicionados</div>
              ) : (
                motoristasDisponiveis.map((m) => (
                  <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-3 flex-wrap">
            <span>Fechamento — {competencia}</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={rowsWithComputed.length === 0}
              onClick={() =>
                exportRowsToExcel(
                  `fechamento_${competencia}.xlsx`,
                  "Fechamento",
                  [
                    "Motorista",
                    "Acumulado do Mês",
                    "Abastecimento",
                    "Total de Desconto",
                    "Fechamento Anterior",
                    "Ajudante",
                    "10% a Mais",
                    "Chave PIX",
                    "Favorecido",
                  ],
                  rowsWithComputed.map(({ row: r, acumulado }) => [
                    r.motorista,
                    acumulado,
                    parseNum(r.abastecimento),
                    parseNum(r.totalDesconto),
                    parseNum(r.fechamentoAnterior),
                    parseNum(r.ajudante),
                    parseNum(r.dezPorCentoAMais),
                    r.chavePix,
                    r.favorecido,
                  ]),
                  [22, 16, 14, 16, 16, 12, 12, 22, 22]
                )
              }
            >
              <FileDown className="h-4 w-4" /> Exportar Excel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Motorista</TableHead>
                  <TableHead className="text-center min-w-[120px]">Acumulado do Mês</TableHead>
                  {EDITABLE_FIELDS.map((f) => (
                    <TableHead key={f.key} className="text-center min-w-[110px]">{f.label}</TableHead>
                  ))}
                  <TableHead className="min-w-[160px]">Chave PIX</TableHead>
                  <TableHead className="min-w-[160px]">Favorecido</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : rowsWithComputed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-center py-10 text-muted-foreground">
                      Nenhum fechamento para {competencia}. Adicione um motorista acima.
                    </TableCell>
                  </TableRow>
                ) : (
                  rowsWithComputed.map(({ row: r, acumulado }, i) => (
                    <TableRow key={r.id ?? `new-${r.motorista}`}>
                      <TableCell className="font-medium whitespace-nowrap">{r.motorista}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground whitespace-nowrap">
                        {formatCurrencyBR(acumulado)}
                      </TableCell>
                      {EDITABLE_FIELDS.map((f) => (
                        <TableCell key={f.key}>
                          <Input
                            className="h-8 text-sm text-right w-24"
                            placeholder="0,00"
                            value={(r as any)[f.key]}
                            onChange={(e) => updateField(i, f.key, e.target.value)}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Input
                          className="h-8 text-sm w-36"
                          placeholder="Chave PIX"
                          value={r.chavePix}
                          onChange={(e) => updateField(i, "chavePix", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-sm w-36"
                          placeholder="Favorecido"
                          value={r.favorecido}
                          onChange={(e) => updateField(i, "favorecido", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600"
                            title="Salvar"
                            onClick={() => saveMutation.mutate(r)}
                            disabled={saveMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            title="Remover"
                            onClick={() => removeRow(i)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary"
                            title="Exportar Completo (PDF)"
                            onClick={() => handleExportCompleto(r, acumulado)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {rowsWithComputed.length > 0 && (
                  <TableRow className="bg-primary/5 font-bold border-t-2">
                    <TableCell className="text-right text-xs text-muted-foreground">TOTAL</TableCell>
                    <TableCell className="text-center">{formatCurrencyBR(totals.acumulado)}</TableCell>
                    {EDITABLE_FIELDS.map((f) => (
                      <TableCell key={f.key} className="text-right">
                        {formatCurrencyBR(totals[f.key])}
                      </TableCell>
                    ))}
                    <TableCell colSpan={3} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
