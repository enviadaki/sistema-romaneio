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
import { Trash2, Upload, FileText, CheckCircle, AlertCircle, X, Eraser } from "lucide-react";

type PackageRow = { trackingNumber: string; city: string; promisedDeliveryDate: string };

type FilePreview = {
  rows: PackageRow[];
  fileName: string;
  errors: string[];
};

export default function Cadastro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { operation } = useOperation();

  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"single" | "bulk" | "file">("single");
  const [periodTab, setPeriodTab] = useState<"hoje" | "ontem" | "semana" | "tudo">("hoje");

  // Clear dialog state
  const [clearOpen, setClearOpen] = useState(false);
  const [clearDate, setClearDate] = useState(getTodayDateString);
  const [clearMode, setClearMode] = useState<"date" | "period" | "all">("date");

  // Date range for the active period tab
  const getPeriodRange = (tab: typeof periodTab): { dateFrom?: string; dateTo?: string } => {
    const today = getTodayDateString();
    if (tab === "hoje")   return { dateFrom: today, dateTo: today };
    if (tab === "ontem")  { const y = getYesterdayDateString(); return { dateFrom: y, dateTo: y }; }
    if (tab === "semana") return { dateFrom: getWeekStartDateString(), dateTo: today };
    return {};
  };

  // Single mode state
  const [trackingNumber, setTrackingNumber] = useState("");
  const [city, setCity] = useState("");
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState("");

  // Bulk mode state
  const [bulkData, setBulkData] = useState("");

  // File upload state
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const periodRange = getPeriodRange(periodTab);
  const pkgParams = {
    operation,
    ...(cityFilter !== "ALL" ? { city: cityFilter } : {}),
    ...periodRange,
  };

  const { data: packages, isLoading } = useListPackages(pkgParams, {
    query: { queryKey: getListPackagesQueryKey(pkgParams) },
  });

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
    let params: Record<string, string> = { operation };
    if (clearMode === "date") {
      params.date = clearDate;
    } else if (clearMode === "period" && periodRange.dateFrom) {
      params.dateFrom = periodRange.dateFrom;
      if (periodRange.dateTo) params.dateTo = periodRange.dateTo;
    }
    // clearMode === "all" → no date params, just operation
    clearPkgs.mutate({ params } as any, {
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

    createPkg.mutate(
      { data: { trackingNumber, city, promisedDeliveryDate, operation } },
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

  const parseRows = (rawRows: Record<string, string>[], fileName: string): FilePreview => {
    const errors: string[] = [];
    const rows: PackageRow[] = [];

    rawRows.forEach((row, idx) => {
      const keys = Object.keys(row).map(k => k.toLowerCase().trim());
      const vals = Object.values(row).map(v => (v ?? "").toString().trim());

      // Try to auto-detect columns by header name
      const colMap: Record<string, number> = {};
      keys.forEach((k, i) => {
        if (/rastreio|tracking|código|codigo|rastreador/.test(k)) colMap.tracking = i;
        if (/cidade|city|destino/.test(k)) colMap.city = i;
        if (/data|date|promessa|entrega|delivery/.test(k)) colMap.date = i;
      });

      let trackingVal: string;
      let cityVal: string;
      let dateVal: string;

      if (Object.keys(colMap).length >= 3) {
        trackingVal = vals[colMap.tracking];
        cityVal = vals[colMap.city];
        dateVal = vals[colMap.date];
      } else if (vals.length >= 3) {
        // Positional: col 0 = tracking, col 1 = city, col 2 = date
        trackingVal = vals[0];
        cityVal = vals[1];
        dateVal = vals[2];
      } else {
        errors.push(`Linha ${idx + 2}: colunas insuficientes (${vals.length} encontradas, 3 necessárias)`);
        return;
      }

      if (!trackingVal) {
        errors.push(`Linha ${idx + 2}: rastreador vazio`);
        return;
      }
      if (!cityVal) {
        errors.push(`Linha ${idx + 2}: cidade vazia`);
        return;
      }

      // Normalize date: if it's a number (Excel serial date), convert it
      let normalizedDate = dateVal;
      if (/^\d{5}$/.test(dateVal)) {
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + parseInt(dateVal) * 86400000);
        normalizedDate = d.toISOString().slice(0, 10);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
        // DD/MM/YYYY -> YYYY-MM-DD
        const [dd, mm, yyyy] = dateVal.split("/");
        normalizedDate = `${yyyy}-${mm}-${dd}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        normalizedDate = dateVal;
      } else if (dateVal) {
        // Try parsing as generic date
        const parsed = new Date(dateVal);
        if (!isNaN(parsed.getTime())) {
          normalizedDate = parsed.toISOString().slice(0, 10);
        } else {
          errors.push(`Linha ${idx + 2}: data "${dateVal}" inválida (use YYYY-MM-DD ou DD/MM/YYYY)`);
          return;
        }
      }

      rows.push({ trackingNumber: trackingVal, city: cityVal, promisedDeliveryDate: normalizedDate });
    });

    return { rows, fileName, errors };
  };

  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const preview = parseRows(result.data as Record<string, string>[], file.name);
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
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
          const preview = parseRows(rows, file.name);
          setFilePreview(preview);
        } catch {
          toast({ title: "Erro ao ler arquivo Excel", variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({ title: "Formato não suportado. Use .csv, .xlsx ou .xls", variant: "destructive" });
    }
  }, []);

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

  const handleFileImport = () => {
    if (!filePreview || filePreview.rows.length === 0) return;
    bulkCreate.mutate(
      { data: { packages: filePreview.rows } },
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastro de Pacotes</h1>
        <p className="text-muted-foreground mt-2">Registre novos pacotes no sistema para posterior bipagem.</p>
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
                  <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Ex: BR123456789" required />
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
                      <p>O arquivo deve ter 3 colunas (com ou sem cabecalho):</p>
                      <p className="font-mono text-xs bg-muted rounded px-2 py-1 mt-1">
                        Rastreador | Cidade | Data (YYYY-MM-DD ou DD/MM/YYYY)
                      </p>
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
                        <span><strong>{filePreview.rows.length}</strong> pacotes prontos para importar</span>
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

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setFilePreview(null)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleFileImport}
                        disabled={bulkCreate.isPending || filePreview.rows.length === 0}
                        className="flex-1"
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
                onClick={() => {
                  if (periodTab === "hoje") {
                    setClearMode("date"); setClearDate(getTodayDateString());
                  } else if (periodTab === "ontem") {
                    setClearMode("date"); setClearDate(getYesterdayDateString());
                  } else if (periodTab === "semana") {
                    setClearMode("period");
                  } else {
                    setClearMode("all");
                  }
                  setClearOpen(true);
                }}
              >
                <Eraser className="h-4 w-4 mr-1.5" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Period tabs */}
          {(() => {
            const tabs: { key: typeof periodTab; label: string }[] = [
              { key: "hoje",   label: "Hoje" },
              { key: "ontem",  label: "Ontem" },
              { key: "semana", label: "Esta semana" },
              { key: "tudo",   label: "Tudo" },
            ];
            return (
              <div className="flex gap-1 border-b">
                {tabs.map(t => (
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
                    {periodTab === t.key && packages && packages.length > 0 && (
                      <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {packages.length}
                      </span>
                    )}
                  </button>
                ))}
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

                {/* Mode selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">O que deseja apagar?</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setClearMode("date")}
                      className={`rounded-lg border-2 p-3 text-sm text-left transition-colors ${
                        clearMode === "date"
                          ? "border-destructive bg-destructive/5 font-semibold"
                          : "border-muted hover:border-muted-foreground/40"
                      }`}
                    >
                      <div className="font-medium mb-0.5">Por data</div>
                      <div className="text-xs text-muted-foreground">Um dia específico</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearMode("period")}
                      className={`rounded-lg border-2 p-3 text-sm text-left transition-colors ${
                        clearMode === "period"
                          ? "border-destructive bg-destructive/5 font-semibold"
                          : "border-muted hover:border-muted-foreground/40"
                      }`}
                    >
                      <div className="font-medium mb-0.5">Este período</div>
                      <div className="text-xs text-muted-foreground">Aba ativa</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearMode("all")}
                      className={`rounded-lg border-2 p-3 text-sm text-left transition-colors ${
                        clearMode === "all"
                          ? "border-destructive bg-destructive/5 font-semibold"
                          : "border-muted hover:border-muted-foreground/40"
                      }`}
                    >
                      <div className="font-medium mb-0.5">Todos</div>
                      <div className="text-xs text-muted-foreground">Toda a operação</div>
                    </button>
                  </div>
                </div>

                {/* Date picker — only shown for "date" mode */}
                {clearMode === "date" && (
                  <div className="space-y-1.5">
                    <Label>Data de cadastro dos pacotes</Label>
                    <Input
                      type="date"
                      value={clearDate}
                      onChange={e => setClearDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Serão apagados todos os pacotes cadastrados nessa data.
                    </p>
                  </div>
                )}

                {/* Period info */}
                {clearMode === "period" && (
                  <div className="rounded-lg bg-muted/50 border p-3 text-sm text-muted-foreground">
                    {periodRange.dateFrom === periodRange.dateTo
                      ? <>Serão apagados pacotes do dia <strong>{periodRange.dateFrom}</strong>.</>
                      : <>Serão apagados pacotes de <strong>{periodRange.dateFrom}</strong> até <strong>{periodRange.dateTo}</strong>.</>
                    }
                  </div>
                )}

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
                      : clearMode === "all"
                      ? "Apagar Tudo"
                      : clearMode === "period"
                      ? "Apagar Período"
                      : "Apagar do Dia"}
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
