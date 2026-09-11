import { useState, useRef, useCallback } from "react";
import {
  useListPackages,
  getListPackagesQueryKey,
  useCreatePackage,
  useBulkCreatePackages,
  useDeletePackage,
  useClearPackages,
  useListCities,
  getListCitiesQueryKey,
  getGetStatsQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getTodayDateString, getYesterdayDateString, getWeekStartDateString } from "@/lib/date-utils";
import { useOperation } from "@/contexts/operation-context";
import { validateTbrFormat, tbrValidationMessage } from "@/lib/tbr";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Trash2, Upload, FileText, CheckCircle, AlertCircle, X, Eraser, Download } from "lucide-react";

type PackageRow = { trackingNumber: string; city: string; promisedDeliveryDate: string };

type FilePreview = {
  rows: PackageRow[];
  fileName: string;
  errors: string[];
  sourceRows: Record<string, unknown>[];
  hasArrivalDate: boolean;
  filteredCount: number;
  filterDate: string;
};

const CITY_CORRECTIONS: Record<string, string> = {
  abaira: "Abaíra",
  anage: "Anagé",
  aracatu: "Aracatu",
  arapiranga: "Arapiranga",
  "barra da estiva": "Barra da Estiva",
  "barra do choca": "Barra do Choça",
  "barra nova": "Barra Nova",
  "belo campo": "Belo Campo",
  "boa nova": "Boa Nova",
  "bom jesus da serra": "Bom Jesus da Serra",
  brumado: "Brumado",
  cacule: "Caculé",
  caetanos: "Caetanos",
  caetite: "Caetité",
  "cana brava": "Cana Brava",
  cabralia: "Cabrália",
  caraibas: "Caraíbas",
  carinhanha: "Carinhanha",
  catoles: "Catolés",
  condeuba: "Condeúba",
  cordeiros: "Cordeiros",
  guajeru: "Guajeru",
  guanambi: "Guanambi",
  ibiassuce: "Ibiassucê",
  ibicoara: "Ibicoara",
  iguai: "Iguaí",
  inhobim: "Inhobim",
  inubia: "Inúbia",
  itambe: "Itambé",
  itapetinga: "Itapetinga",
  itaquarai: "Itaquaraí",
  itarantim: "Itarantim",
  itororo: "Itororó",
  ituacu: "Ituaçu",
  iuiu: "Iuiú",
  jacaraci: "Jacaraci",
  jussiape: "Jussiape",
  "lagoa real": "Lagoa Real",
  "licinio de almeida": "Licínio de Almeida",
  "livramento de nossa senhora": "Livramento de Nossa Senhora",
  "livramento de n senhora": "Livramento de Nossa Senhora",
  livramento: "Livramento de Nossa Senhora",
  macarani: "Macarani",
  maetinga: "Maetinga",
  maiquinique: "Maiquinique",
  malhada: "Malhada",
  "malhada de pedras": "Malhada de Pedras",
  "maniaçu": "Maniaçu",
  matina: "Matina",
  mirante: "Mirante",
  morrinhos: "Morrinhos",
  mortugaba: "Mortugaba",
  mutas: "Mutans",
  "nova canaa": "Nova Canaã",
  "palmas de monte alto": "Palmas de Monte Alto",
  paramirim: "Paramirim",
  piata: "Piatã",
  pindai: "Pindaí",
  piripa: "Piripá",
  planalto: "Planalto",
  pocoes: "Poções",
  "presidente janio quadros": "Presidente Jânio Quadros",
  "rio de contas": "Rio de Contas",
  "rio do antonio": "Rio do Antônio",
  "sebastiao laranjeiras": "Sebastião Laranjeiras",
  tanhacu: "Tanhaçu",
  tauapé: "Tauapé",
  tremedal: "Tremedal",
  "triunfo do sincora": "Triunfo do Sincorá",
  urandi: "Urandi",
  "vitoria da conquista": "Vitória da Conquista",
  "erico cardoso": "Érico Cardoso",
};

function removeAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cityKey(value: string): string {
  return removeAccents(value)
    .toLocaleLowerCase("pt-BR")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanImportedCity(rawCity: string, rawCep: string): string {
  if (rawCity.trim() === "Tauapé") return "Tauapé";
  if (rawCep.replace(/\D/g, "") === "46197000") return "Paramirim";

  const trimmed = rawCity.replace(/\s+/g, " ").trim();
  const parenthetical = trimmed.match(/^(.+?)\s*\(([^()]+)\)$/);
  if (parenthetical && cityKey(parenthetical[1]) === "pindorama") {
    const parent = CITY_CORRECTIONS[cityKey(parenthetical[2])] ?? parenthetical[2];
    return `Pindorama (${parent})`;
  }
  return CITY_CORRECTIONS[cityKey(trimmed)] ?? trimmed;
}

function normalizeImportedDate(value: unknown): string {
  if (value === null || value === undefined || String(value).trim() === "" || String(value).trim() === "-") {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  const text = String(value).trim();
  if (/^\d{5}(?:\.\d+)?$/.test(text)) {
    const parsed = XLSX.SSF.parse_date_code(Number(text));
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2]}-${br[1]}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return "";
}

function findColumnIndex(keys: string[], pattern: RegExp): number {
  return keys.findIndex((key) => pattern.test(removeAccents(key.toLocaleLowerCase("pt-BR"))));
}

export default function Cadastro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { operation } = useOperation();

  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"single" | "bulk" | "file">("single");
  const [periodTab, setPeriodTab] = useState<"hoje" | "ontem" | "semana" | "tudo">("hoje");

  // Clear dialog state — no mode selector; scope is always the active period tab
  const [clearOpen, setClearOpen] = useState(false);

  // Stable date strings (Brazil timezone)
  const todayStr = getTodayDateString();
  const yesterdayStr = getYesterdayDateString();
  const weekStartStr = getWeekStartDateString();
  const [fileDateFilter, setFileDateFilter] = useState(todayStr);

  // Single mode state
  const [trackingNumber, setTrackingNumber] = useState("");
  const [city, setCity] = useState("");
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState("");

  // Feedback em tempo real do formato TBR (só se aplica à operação AMAZON).
  const singleTbrCheck =
    operation === "AMAZON" && trackingNumber ? validateTbrFormat(trackingNumber) : null;

  // Bulk mode state
  const [bulkData, setBulkData] = useState("");

  // File upload state
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-tab queries — one per period for independent counts
  const baseFilter = cityFilter !== "ALL" ? { city: cityFilter } : {};
  const hojeParams = { operation, ...baseFilter, dateFrom: todayStr, dateTo: todayStr };
  const ontemParams = { operation, ...baseFilter, dateFrom: yesterdayStr, dateTo: yesterdayStr };
  const semanaParams = { operation, ...baseFilter, dateFrom: weekStartStr, dateTo: todayStr };
  const tudoParams = { operation, ...baseFilter };

  const hojeResult  = useListPackages(hojeParams,  { query: { queryKey: getListPackagesQueryKey(hojeParams) } });
  const ontemResult = useListPackages(ontemParams, { query: { queryKey: getListPackagesQueryKey(ontemParams) } });
  const semanaResult= useListPackages(semanaParams,{ query: { queryKey: getListPackagesQueryKey(semanaParams) } });
  const tudoResult  = useListPackages(tudoParams,  { query: { queryKey: getListPackagesQueryKey(tudoParams) } });

  const tabResults = { hoje: hojeResult, ontem: ontemResult, semana: semanaResult, tudo: tudoResult } as const;
  const { data: packages, isLoading } = tabResults[periodTab];

  const tabCounts: Record<typeof periodTab, number | undefined> = {
    hoje:   hojeResult.data?.length,
    ontem:  ontemResult.data?.length,
    semana: semanaResult.data?.length,
    tudo:   tudoResult.data?.length,
  };

  const { data: cities } = useListCities({
    query: {
      queryKey: [...getListCitiesQueryKey(), operation],
      queryFn: () => customFetch<string[]>(`/api/cities?operation=${operation}`),
    },
  });

  const createPkg = useCreatePackage();
  const bulkCreate = useBulkCreatePackages();
  const deletePkg = useDeletePackage();
  const clearPkgs = useClearPackages();

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListCitiesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
  };

  const handleClear = () => {
    const params: { operation: string; dateFrom?: string; dateTo?: string } = { operation };
    if (periodTab === "hoje")   { params.dateFrom = todayStr;    params.dateTo = todayStr; }
    if (periodTab === "ontem")  { params.dateFrom = yesterdayStr; params.dateTo = yesterdayStr; }
    if (periodTab === "semana") { params.dateFrom = weekStartStr; params.dateTo = todayStr; }
    // "tudo" → no date params, clears all packages for this operation
    clearPkgs.mutate({ params }, {
      onSuccess: (res) => {
        toast({
          title: "Pacotes removidos",
          description: `${res.deleted} pacote${res.deleted !== 1 ? "s" : ""} apagado${res.deleted !== 1 ? "s" : ""} com sucesso.`,
        });
        setClearOpen(false);
        invalidateLists();
      },
      onError: () => {
        toast({ title: "Erro ao limpar pacotes.", variant: "destructive" });
      },
    });
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || !city || !promisedDeliveryDate) return;

    // Código TBR é obrigatório só na AMAZON — LOGGI continua sem formato exigido.
    let finalTrackingNumber = trackingNumber;
    if (operation === "AMAZON") {
      const tbr = validateTbrFormat(trackingNumber);
      if (!tbr.valid) {
        toast({ title: tbrValidationMessage(tbr.reason), variant: "destructive" });
        return;
      }
      finalTrackingNumber = tbr.normalized;
    }

    createPkg.mutate(
      { data: { trackingNumber: finalTrackingNumber, city, promisedDeliveryDate, operation } },
      {
        onSuccess: () => {
          toast({ title: "Pacote registrado com sucesso!" });
          setTrackingNumber("");
          invalidateLists();
        },
        onError: () => {
          toast({ title: "Erro ao registrar pacote.", variant: "destructive" });
        }
      }
    );
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkData) return;

    try {
      const lines = bulkData.split("\n").filter(l => l.trim().length > 0);
      const packagesData = lines.map(line => {
        const parts = line.split("\t");
        if (parts.length >= 3) {
          return { trackingNumber: parts[0].trim(), city: parts[1].trim(), promisedDeliveryDate: parts[2].trim(), operation };
        }
        const csvParts = line.split(",");
        if (csvParts.length >= 3) {
          return { trackingNumber: csvParts[0].trim(), city: csvParts[1].trim(), promisedDeliveryDate: csvParts[2].trim(), operation };
        }
        throw new Error("Formato inválido. Use: Rastreador, Cidade, Data (YYYY-MM-DD)");
      });

      bulkCreate.mutate(
        { data: { packages: packagesData } },
        {
          onSuccess: (res) => {
            toast({
              title: "Importação concluída",
              description: `${res.imported} importados, ${res.skipped} ignorados.`
            });
            setBulkData("");
            invalidateLists();
          },
          onError: () => {
            toast({ title: "Erro na importação em lote.", variant: "destructive" });
          }
        }
      );
    } catch (err: any) {
      toast({ title: "Erro no formato dos dados", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = (id: number) => {
    deletePkg.mutate({ id }, { onSuccess: () => invalidateLists() });
  };

  // --- File upload logic ---

  const parseRows = (rawRows: Record<string, unknown>[], fileName: string, targetDate: string): FilePreview => {
    const errors: string[] = [];
    const rows: PackageRow[] = [];
    let filteredCount = 0;

    const firstRowKeys = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const hasArrivalDate = findColumnIndex(firstRowKeys, /chegou|chegada|entrada|received/) >= 0;

    rawRows.forEach((row, idx) => {
      const originalKeys = Object.keys(row);
      const keys = originalKeys.map(k => k.toLowerCase().trim());
      const vals = originalKeys.map(k => (row[k] ?? "").toString().trim());

      // Try to auto-detect columns by header name
      const trackingIndex = findColumnIndex(keys, /rastreio|tracking|rastreador|codigo de barras|barcode|codigo/);
      const cityIndex = findColumnIndex(keys, /cidade|city|destino/);
      const dateIndex = findColumnIndex(keys, /prazo|promessa|entrega|delivery|date|data/);
      const arrivalIndex = findColumnIndex(keys, /chegou|chegada|entrada|received/);
      const cepIndex = findColumnIndex(keys, /(^|\s)cep(\s|$)/);

      let trackingVal: string;
      let cityVal: string;
      let dateVal: string;

      if (trackingIndex >= 0 && cityIndex >= 0 && dateIndex >= 0) {
        trackingVal = vals[trackingIndex];
        cityVal = vals[cityIndex];
        dateVal = vals[dateIndex];
      } else if (vals.length >= 3) {
        // Positional: col 0 = tracking, col 1 = city, col 2 = date
        trackingVal = vals[0];
        cityVal = vals[1];
        dateVal = vals[2];
      } else {
        errors.push(`Linha ${idx + 2}: colunas insuficientes (${vals.length} encontradas, 3 necessárias)`);
        return;
      }

      if (hasArrivalDate && arrivalIndex >= 0) {
        const arrivalDate = normalizeImportedDate(row[originalKeys[arrivalIndex]]);
        if (!arrivalDate) {
          errors.push(`Linha ${idx + 2}: data de chegada inválida`);
          return;
        }
        if (targetDate && arrivalDate !== targetDate) {
          filteredCount++;
          return;
        }
      }

      if (!trackingVal) {
        errors.push(`Linha ${idx + 2}: rastreador vazio`);
        return;
      }
      if (!cityVal) {
        errors.push(`Linha ${idx + 2}: cidade vazia`);
        return;
      }

      // Código TBR é obrigatório só na AMAZON — LOGGI continua sem formato exigido.
      if (operation === "AMAZON") {
        const tbr = validateTbrFormat(trackingVal);
        if (!tbr.valid) {
          errors.push(`Linha ${idx + 2}: ${tbrValidationMessage(tbr.reason)}`);
          return;
        }
        trackingVal = tbr.normalized;
      }

      const normalizedDate = normalizeImportedDate(dateVal);
      if (!normalizedDate) {
        errors.push(`Linha ${idx + 2}: data "${dateVal}" inválida (use YYYY-MM-DD ou DD/MM/YYYY)`);
        return;
      }

      const cepVal = cepIndex >= 0 ? vals[cepIndex] : "";
      rows.push({
        trackingNumber: trackingVal,
        city: cleanImportedCity(cityVal, cepVal),
        promisedDeliveryDate: normalizedDate,
      });
    });

    return { rows, fileName, errors, sourceRows: rawRows, hasArrivalDate, filteredCount, filterDate: targetDate };
  };

  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const preview = parseRows(result.data as Record<string, unknown>[], file.name, fileDateFilter);
          setFilePreview(preview);
        },
        error: () => {
          toast({ title: "Erro ao ler CSV", variant: "destructive" });
        }
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
          const preview = parseRows(rows, file.name, fileDateFilter);
          setFilePreview(preview);
        } catch {
          toast({ title: "Erro ao ler arquivo Excel", variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({ title: "Formato não suportado. Use .csv, .xlsx ou .xls", variant: "destructive" });
    }
  }, [fileDateFilter, parseRows]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileDateChange = (value: string) => {
    setFileDateFilter(value);
    if (filePreview) {
      setFilePreview(parseRows(filePreview.sourceRows, filePreview.fileName, value));
    }
  };

  const handleFileDownload = () => {
    if (!filePreview || filePreview.rows.length === 0) return;

    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Código de barras", "Cidade", "Prazo"],
      ...filePreview.rows.map((row) => [
        row.trackingNumber,
        row.city,
        new Date(`${row.promisedDeliveryDate}T12:00:00`),
      ]),
    ]);
    for (let rowIndex = 1; rowIndex <= filePreview.rows.length; rowIndex++) {
      const dateCell = worksheet[`C${rowIndex + 1}`];
      if (dateCell) {
        dateCell.t = "d";
        dateCell.z = "dd/mm/yy";
      }
    }
    worksheet["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 13 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pacotes");
    const suffix = filePreview.filterDate || "processados";
    XLSX.writeFile(workbook, `pacotes_prontos_${suffix}.xlsx`, { cellDates: true });
    toast({ title: "Planilha pronta para baixar", description: `${filePreview.rows.length} pacotes exportados.` });
  };

  const handleFileImport = () => {
    if (!filePreview || filePreview.rows.length === 0) return;
    bulkCreate.mutate(
      { data: { packages: filePreview.rows.map(r => ({ ...r, operation })) } },
      {
        onSuccess: (res) => {
          toast({
            title: "Importação concluída",
            description: `${res.imported} importados, ${res.skipped} já existentes.`
          });
          setFilePreview(null);
          invalidateLists();
        },
        onError: () => {
          toast({ title: "Erro na importação.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Pacotes</h1>
          <p className="text-muted-foreground mt-2">Registre novos pacotes no sistema para posterior bipagem.</p>
        </div>
        <span className={`mt-1 shrink-0 text-sm font-bold px-3 py-1 rounded-full border ${
          operation === "LOGGI"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-orange-50 text-orange-700 border-orange-200"
        }`}>
          {operation}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div className="flex gap-2 border-b pb-4 flex-wrap">
              <Button
                variant={activeTab === "single" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("single")}
              >
                Individual
              </Button>
              <Button
                variant={activeTab === "bulk" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("bulk")}
              >
                Colar do Excel
              </Button>
              <Button
                variant={activeTab === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => { setActiveTab("file"); setFilePreview(null); }}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Arquivo CSV/Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Single */}
            {activeTab === "single" && (
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Rastreador (Tracking Number)</Label>
                  <Input
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder={operation === "AMAZON" ? "Ex: TBR426326094" : "Ex: BR123456789"}
                    required
                  />
                  {singleTbrCheck && !singleTbrCheck.valid && (
                    <p className="text-xs text-destructive">{tbrValidationMessage(singleTbrCheck.reason)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: São Paulo" required />
                </div>
                <div className="space-y-2">
                  <Label>Data de Entrega Prometida</Label>
                  <Input type="date" value={promisedDeliveryDate} onChange={e => setPromisedDeliveryDate(e.target.value)} required />
                </div>
                <Button type="submit" disabled={createPkg.isPending} className="w-full">
                  {createPkg.isPending ? "Salvando..." : "Cadastrar Pacote"}
                </Button>
              </form>
            )}

            {/* Bulk paste */}
            {activeTab === "bulk" && (
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cole os dados (Rastreador, Cidade, Data)</Label>
                  <CardDescription>Cole diretamente do Excel/Planilhas. Cada linha = 1 pacote, separado por tabulação ou vírgula.</CardDescription>
                  <Textarea
                    rows={10}
                    value={bulkData}
                    onChange={e => setBulkData(e.target.value)}
                    placeholder={"BR123456\tSão Paulo\t2025-05-15\nBR987654\tCampinas\t2025-05-16"}
                    className="font-mono text-sm"
                  />
                </div>
                <Button type="submit" disabled={bulkCreate.isPending} className="w-full">
                  {bulkCreate.isPending ? "Importando..." : "Importar Pacotes"}
                </Button>
              </form>
            )}

            {/* File upload */}
            {activeTab === "file" && (
              <div className="space-y-4">
                {!filePreview ? (
                  <>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30"
                      }`}
                    >
                      <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium mb-1">Arraste o arquivo aqui ou clique para selecionar</p>
                      <p className="text-sm text-muted-foreground">Suporta .csv, .xlsx e .xls</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Formato esperado:</p>
                       <p>Envie a listagem completa ou um arquivo com 3 colunas:</p>
                      <p className="font-mono text-xs bg-muted rounded px-2 py-1 mt-1">
                         Código de barras | Cidade | Prazo
                      </p>
                       <p className="text-xs mt-2">Quando existir a coluna “Chegou em”, o sistema mantém apenas os pacotes da data selecionada.</p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{filePreview.fileName}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setFilePreview(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {filePreview.hasArrivalDate && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                        <Label htmlFor="file-date-filter">Manter apenas pacotes chegados em</Label>
                        <Input
                          id="file-date-filter"
                          type="date"
                          value={fileDateFilter}
                          onChange={(e) => handleFileDateChange(e.target.value)}
                          className="bg-background"
                        />
                        <p className="text-xs text-muted-foreground">
                          Data padrão: hoje. {filePreview.filteredCount > 0 && (
                            <>{filePreview.filteredCount} pacote{filePreview.filteredCount !== 1 ? "s" : ""} de outras datas será{filePreview.filteredCount !== 1 ? "ão" : ""} excluído{filePreview.filteredCount !== 1 ? "s" : ""}.</>
                          )}
                        </p>
                      </div>
                    )}

                    {filePreview.errors.length > 0 && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          {filePreview.errors.length} linha(s) com problema
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 mt-1 max-h-24 overflow-y-auto">
                          {filePreview.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </div>
                    )}

                    {filePreview.rows.length > 0 && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                         <span><strong>{filePreview.rows.length}</strong> pacotes prontos para baixar ou cadastrar</span>
                      </div>
                    )}

                    {/* Preview table */}
                    <div className="rounded-lg border overflow-hidden max-h-56 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Rastreador</TableHead>
                            <TableHead className="text-xs">Cidade</TableHead>
                            <TableHead className="text-xs">Data Prometida</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filePreview.rows.slice(0, 50).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs py-1.5">{row.trackingNumber}</TableCell>
                              <TableCell className="text-xs py-1.5">{row.city}</TableCell>
                              <TableCell className="text-xs py-1.5">{row.promisedDeliveryDate}</TableCell>
                            </TableRow>
                          ))}
                          {filePreview.rows.length > 50 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-xs text-center text-muted-foreground py-2">
                                ... e mais {filePreview.rows.length - 50} pacotes
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                     <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => setFilePreview(null)}
                         className="flex-1 min-w-28"
                      >
                        Cancelar
                      </Button>
                       <Button
                         variant="outline"
                         onClick={handleFileDownload}
                         disabled={filePreview.rows.length === 0}
                         className="flex-1 min-w-40"
                       >
                         <Download className="h-4 w-4 mr-1.5" />
                         Baixar planilha pronta
                       </Button>
                      <Button
                        onClick={handleFileImport}
                        disabled={bulkCreate.isPending || filePreview.rows.length === 0}
                         className="flex-1 min-w-40"
                      >
                        {bulkCreate.isPending ? "Importando..." : `Importar ${filePreview.rows.length} pacotes`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Pacotes Cadastrados</h2>
              {packages && packages.length > 0 && (
                <span className="text-sm text-muted-foreground">({packages.length})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[180px]">
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as Cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as Cidades</SelectItem>
                    {cities?.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setClearOpen(true)}
              >
                <Eraser className="h-4 w-4 mr-1.5" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Period tabs — each shows its own independent count */}
          {(() => {
            const tabs: { key: typeof periodTab; label: string }[] = [
              { key: "hoje",   label: "Hoje" },
              { key: "ontem",  label: "Ontem" },
              { key: "semana", label: "Esta semana" },
              { key: "tudo",   label: "Tudo" },
            ];
            return (
              <div className="flex gap-1 border-b">
                {tabs.map(t => {
                  const count = tabCounts[t.key];
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setPeriodTab(t.key)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        periodTab === t.key
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                      {count !== undefined && count > 0 && (
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                          periodTab === t.key
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Clear packages dialog */}
          <Dialog open={clearOpen} onOpenChange={setClearOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Eraser className="h-5 w-5" />
                  Limpar Pacotes
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  ⚠️ Esta ação é <strong>irreversível</strong>. Os pacotes apagados não poderão ser recuperados.
                </div>

                {/* Scope description — derived from active tab, no user choice */}
                <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1">
                  <p className="text-muted-foreground">
                    {periodTab === "hoje" && (
                      <>Serão apagados os pacotes cadastrados <strong>hoje</strong> ({todayStr}) da operação <strong>{operation}</strong>.</>
                    )}
                    {periodTab === "ontem" && (
                      <>Serão apagados os pacotes cadastrados <strong>ontem</strong> ({yesterdayStr}) da operação <strong>{operation}</strong>.</>
                    )}
                    {periodTab === "semana" && (
                      <>Serão apagados os pacotes cadastrados <strong>desta semana</strong> ({weekStartStr} a {todayStr}) da operação <strong>{operation}</strong>.</>
                    )}
                    {periodTab === "tudo" && (
                      <>Serão apagados <strong>todos</strong> os pacotes da operação <strong>{operation}</strong>, sem restrição de data.</>
                    )}
                  </p>
                  {tabCounts[periodTab] !== undefined && (
                    <p className="font-semibold text-foreground">
                      {tabCounts[periodTab]} pacote{tabCounts[periodTab] !== 1 ? "s" : ""} {periodTab === "tudo" ? "no total" : "neste período"}.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setClearOpen(false)}
                    disabled={clearPkgs.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleClear}
                    disabled={clearPkgs.isPending}
                  >
                    {clearPkgs.isPending
                      ? "Apagando..."
                      : periodTab === "tudo"
                      ? "Apagar Tudo"
                      : "Apagar Período"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rastreador</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Data Prometida</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4">Carregando...</TableCell></TableRow>
                ) : packages?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4">Nenhum pacote encontrado.</TableCell></TableRow>
                ) : packages?.map(pkg => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-mono text-sm">{pkg.trackingNumber}</TableCell>
                    <TableCell>{pkg.city}</TableCell>
                    <TableCell>{formatDate(pkg.promisedDeliveryDate)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
