import { useEffect, useMemo, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2 } from "lucide-react";

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
  viagem: string;
  saldo: string;
  chavePix: string;
  favorecido: string;
  saving?: boolean;
}

const NUMERIC_FIELDS = [
  { key: "abastecimento", label: "Abastecimento" },
  { key: "totalDesconto", label: "Total de Desconto" },
  { key: "fechamentoAnterior", label: "Fechamento Anterior" },
  { key: "ajudante", label: "Ajudante" },
  { key: "dezPorCentoAMais", label: "10% a Mais" },
  { key: "viagem", label: "Viagem" },
  { key: "saldo", label: "Saldo" },
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
    viagem: toDisplay(s.viagem),
    saldo: toDisplay(s.saldo),
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

// Fechamento financeiro mensal por motorista — abastecimento, descontos, ajudante,
// 10% a mais, viagem e saldo, preenchidos manualmente pelo financeiro todo mês
// (igual à planilha de fechamento usada hoje).
export default function FinanceiroFechamento() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [addMotorista, setAddMotorista] = useState("");

  const { data: settlementsData, isLoading } = useQuery<DriverSettlement[]>({
    queryKey: ["driver-settlements", competencia],
    queryFn: () => customFetch<DriverSettlement[]>(`/api/driver-settlements?competencia=${competencia}`),
  });

  const { data: motoristasData } = useQuery<MotoristaRow[]>({
    queryKey: ["motoristas-list"],
    queryFn: () => customFetch<MotoristaRow[]>("/api/motoristas"),
  });
  const motoristas = motoristasData ?? [];

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
        viagem: "",
        saldo: "",
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
        viagem: parseNum(row.viagem),
        saldo: parseNum(row.saldo),
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

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const f of NUMERIC_FIELDS) t[f.key] = 0;
    for (const r of rows) {
      for (const f of NUMERIC_FIELDS) t[f.key] += parseNum((r as any)[f.key]);
    }
    return t;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Fechamento Mensal de Motoristas</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Abastecimento, descontos, ajudante, 10% a mais, viagem e saldo — preenchido manualmente todo mês.
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
          <CardTitle className="text-base">Fechamento — {competencia}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Motorista</TableHead>
                  {NUMERIC_FIELDS.map((f) => (
                    <TableHead key={f.key} className="text-center min-w-[110px]">{f.label}</TableHead>
                  ))}
                  <TableHead className="min-w-[160px]">Chave PIX</TableHead>
                  <TableHead className="min-w-[160px]">Favorecido</TableHead>
                  <TableHead className="w-[90px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                      Nenhum fechamento para {competencia}. Adicione um motorista acima.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow key={r.id ?? `new-${r.motorista}`}>
                      <TableCell className="font-medium whitespace-nowrap">{r.motorista}</TableCell>
                      {NUMERIC_FIELDS.map((f) => (
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {rows.length > 0 && (
                  <TableRow className="bg-primary/5 font-bold border-t-2">
                    <TableCell className="text-right text-xs text-muted-foreground">TOTAL</TableCell>
                    {NUMERIC_FIELDS.map((f) => (
                      <TableCell key={f.key} className="text-right">
                        {totals[f.key].toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
