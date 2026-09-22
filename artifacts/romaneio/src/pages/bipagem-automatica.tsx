// Bipagem Automática (LOGGI) — ver conversa "vamos migrar algumas ideias" e
// "pensar mais a fundo": diferente do modo "Rota" do Pré-Sorter (onde o
// operador escolhe UMA rota manualmente antes de bipar, exigindo separar os
// pacotes por pilha antes), aqui a rota de cada pacote já vem calculada no
// momento da importação (por cidade — ver modules/loggi/rota.ts no
// servidor), então a bipagem aceita pacotes de rotas misturadas, em qualquer
// ordem: cada bipagem só confirma o pacote (mesmo POST /scans que o
// Pré-Sorter já usa — conta como bipado em todo lugar, sem precisar abrir a
// outra tela) e imprime a etiqueta certa na hora.
//
// O modo "Rota" manual do Pré-Sorter continua existindo, sem alteração —
// serve de reforço pra pacote sem cadastro prévio aqui, ou pra forçar uma
// rota diferente da automática quando necessário.
import { useMemo, useRef, useState } from "react";
import {
  useListPackages,
  useListScans,
  useBulkCreatePackages,
  useCreateScan,
  getListPackagesQueryKey,
  getListScansQueryKey,
  customFetch,
  ApiError,
  type Package,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString } from "@/lib/date-utils";
import { playScanSuccess, playScanError, playScanWarning } from "@/lib/scan-sounds";
import { buildLoggiPreSorterLabelZpl } from "@/lib/zpl-label";
import { printZplLabel } from "@/lib/qz-print";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Printer, CheckCircle2, AlertTriangle, Ban, ScanLine } from "lucide-react";

// Mesma normalização já usada no backend (ver modules/amazon/filial.ts,
// normalizeCityKey) e em cadastro.tsx (dynamicCityKey) — maiúscula, sem
// acento, espaços colapsados. Precisa ficar em sincronia com a versão do
// servidor pra o preview da importação bater com o que o cadastro de fato
// vai gravar.
function normalizeCityKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

interface ParsedImportRow {
  trackingNumber: string;
  city: string;
  cep?: string;
  promisedDeliveryDate?: string;
}

interface PreviewRow extends ParsedImportRow {
  rota: string | null;
}

const HEADER_ALIASES: Record<keyof ParsedImportRow, string[]> = {
  trackingNumber: ["rastreio", "tracking", "trackingnumber", "codigo", "código"],
  city: ["cidade", "city"],
  cep: ["cep"],
  promisedDeliveryDate: ["prazo", "previsao", "previsão", "data", "promiseddeliverydate"],
};

function detectDelimiter(line: string): string {
  let best = ",";
  let bestCount = -1;
  for (const candidate of [",", ";", "\t"]) {
    const count = line.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

// Parser propositalmente tolerante — aceita tanto uma planilha exportada com
// cabeçalho (rastreio/cidade/cep/prazo, em qualquer ordem) quanto uma lista
// simples colada sem cabeçalho (rastreio, cidade nessa ordem). Linha que não
// tem pelo menos rastreio e cidade é descartada silenciosamente — não tem
// como confirmar bipagem nem calcular rota sem os dois.
function parseImportText(text: string): ParsedImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = lines[0].split(delimiter).map((c) => c.trim().toLowerCase());
  const looksLikeHeader = firstCells.some(
    (cell) => HEADER_ALIASES.trackingNumber.includes(cell) || HEADER_ALIASES.city.includes(cell),
  );

  let colIndex: Record<keyof ParsedImportRow, number> = {
    trackingNumber: 0,
    city: 1,
    cep: -1,
    promisedDeliveryDate: -1,
  };
  let dataLines = lines;

  if (looksLikeHeader) {
    dataLines = lines.slice(1);
    const found: Partial<Record<keyof ParsedImportRow, number>> = {};
    firstCells.forEach((cell, i) => {
      (Object.keys(HEADER_ALIASES) as (keyof ParsedImportRow)[]).forEach((field) => {
        if (found[field] === undefined && HEADER_ALIASES[field].includes(cell)) {
          found[field] = i;
        }
      });
    });
    colIndex = {
      trackingNumber: found.trackingNumber ?? 0,
      city: found.city ?? 1,
      cep: found.cep ?? -1,
      promisedDeliveryDate: found.promisedDeliveryDate ?? -1,
    };
  }

  const rows: ParsedImportRow[] = [];
  for (const line of dataLines) {
    const cells = line.split(delimiter).map((c) => c.trim());
    const trackingNumber = cells[colIndex.trackingNumber]?.trim();
    const city = cells[colIndex.city]?.trim();
    if (!trackingNumber || !city) continue;
    rows.push({
      trackingNumber,
      city,
      cep: colIndex.cep >= 0 ? cells[colIndex.cep]?.trim() || undefined : undefined,
      promisedDeliveryDate:
        colIndex.promisedDeliveryDate >= 0 ? cells[colIndex.promisedDeliveryDate]?.trim() || undefined : undefined,
    });
  }
  return rows;
}

type FeedStatus = "success" | "duplicate" | "not_found" | "no_route" | "error";

interface FeedEntry {
  id: number;
  status: FeedStatus;
  trackingNumber: string;
  city?: string;
  rota?: string | null;
  time: string;
}

export default function BipagemAutomatica() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = getTodayDateString();

  const [step, setStep] = useState<"import" | "scan">("import");
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Config de impressora — mesmas chaves de localStorage do Pré-Sorter, de
  // propósito: é a mesma impressora pareada no mesmo PC físico, então
  // configurar uma vez vale pras duas telas.
  const [printerEnabled, setPrinterEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("presorter-printer-enabled") === "true";
    } catch {
      return false;
    }
  });
  const [printerName, setPrinterName] = useState<string>(() => {
    try {
      return localStorage.getItem("presorter-printer-name") ?? "ZQ630";
    } catch {
      return "ZQ630";
    }
  });
  const printerErrorNotifiedRef = useRef(false);

  function updatePrinterEnabled(value: boolean) {
    setPrinterEnabled(value);
    try {
      localStorage.setItem("presorter-printer-enabled", String(value));
    } catch {
      // localStorage indisponível — a preferência só não persiste entre sessões.
    }
  }
  function updatePrinterName(value: string) {
    setPrinterName(value);
    try {
      localStorage.setItem("presorter-printer-name", value);
    } catch {
      // ver comentário acima
    }
  }

  // Mapa cidade -> rota completo (LOGGI), pra calcular a rota de cada linha
  // da importação ANTES de confirmar o cadastro — ver GET
  // /loggi-rotas-por-cidade no servidor (modules/loggi/rota.ts).
  const { data: cityRoutes, isLoading: cityRoutesLoading } = useQuery({
    queryKey: ["loggi-rotas-por-cidade"],
    queryFn: () => customFetch<{ city: string; route: string }[]>("/api/loggi-rotas-por-cidade"),
  });

  const cityRouteMap = useMemo(() => {
    const map = new Map<string, string>();
    (cityRoutes ?? []).forEach((r) => {
      const key = normalizeCityKey(r.city);
      if (!map.has(key)) map.set(key, r.route);
    });
    return map;
  }, [cityRoutes]);

  const previewRows: PreviewRow[] = useMemo(
    () =>
      parsedRows.map((row) => ({
        ...row,
        rota: cityRouteMap.get(normalizeCityKey(row.city)) ?? null,
      })),
    [parsedRows, cityRouteMap],
  );

  const readyCount = previewRows.filter((r) => r.rota).length;
  const warnCount = previewRows.length - readyCount;

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setParsedRows(parseImportText(text));
    };
    reader.readAsText(file, "utf-8");
  }

  // Lote liberado pra bipagem — referência local só pra mostrar
  // total/restantes/rotas nesta sessão (ver contadores abaixo). Quem decide
  // de verdade se um pacote existe e qual a rota dele é sempre o servidor
  // (packages/scans, consultados a seguir), então perder isso num reload de
  // página não quebra a bipagem — só reseta os contadores visuais do lote.
  const [batch, setBatch] = useState<PreviewRow[]>([]);

  const bulkCreatePackages = useBulkCreatePackages();

  function handleLiberarBipagem() {
    if (previewRows.length === 0) return;
    bulkCreatePackages.mutate(
      {
        data: {
          packages: previewRows.map((r) => ({
            trackingNumber: r.trackingNumber,
            city: r.city,
            cep: r.cep,
            promisedDeliveryDate: r.promisedDeliveryDate || today,
            operation: "LOGGI",
          })),
        },
      },
      {
        onSuccess: (result) => {
          toast({
            title: "Importação concluída",
            description: `${result.imported} importado(s), ${result.skipped} já existia(m)${
              result.errors.length ? `, ${result.errors.length} erro(s)` : ""
            }.`,
          });
          setBatch(previewRows);
          setStep("scan");
          setTimeout(() => scanInputRef.current?.focus(), 100);
        },
        onError: () => {
          toast({
            title: "Falha ao importar pacotes",
            description: "Confira a lista e tente novamente.",
            variant: "destructive",
          });
        },
      },
    );
  }

  // ---- Bipagem ----
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanCode, setScanCode] = useState("");
  const [scannedCodes, setScannedCodes] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const feedIdRef = useRef(0);

  // Fonte da verdade de pacote/bipagem — mesma consulta que o Pré-Sorter já
  // usa (useListPackages/useListScans), não o lote local: sobrevive a
  // reload de página e funciona mesmo pra pacote importado numa sessão
  // anterior, contanto que seja de hoje.
  const packagesParams = { operation: "LOGGI", dateFrom: today, dateTo: today };
  const { data: packages } = useListPackages(packagesParams, {
    query: { queryKey: getListPackagesQueryKey(packagesParams), enabled: step === "scan" },
  });
  const scansParams = { operation: "LOGGI", date: today };
  const { data: scans } = useListScans(scansParams, {
    query: { queryKey: getListScansQueryKey(scansParams), enabled: step === "scan" },
  });

  const packagesMap = useMemo(() => {
    const map = new Map<string, Package>();
    (packages ?? []).forEach((p) => map.set(p.trackingNumber, p));
    return map;
  }, [packages]);

  const scannedTodaySet = useMemo(() => {
    const set = new Set<string>();
    (scans ?? []).forEach((s) => set.add(s.trackingNumber));
    return set;
  }, [scans]);

  const createScan = useCreateScan();

  function pushFeed(entry: Omit<FeedEntry, "id" | "time">) {
    feedIdRef.current += 1;
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date());
    setFeed((prev) => [{ ...entry, id: feedIdRef.current, time }, ...prev].slice(0, 60));
  }

  function printLabelFor(pkg: { city: string; rota?: string | null }, trackingNumber: string) {
    if (!printerEnabled || !printerName.trim()) return;
    if (!pkg.rota) return; // sem rota conhecida — nada pra imprimir com confiança
    const zpl = buildLoggiPreSorterLabelZpl({
      city: pkg.city,
      routeName: pkg.rota,
      trackingNumber,
    });
    printZplLabel(printerName.trim(), zpl)
      .then(() => {
        printerErrorNotifiedRef.current = false;
      })
      .catch((err) => {
        console.warn("[bipagem-automatica] falha ao imprimir etiqueta:", err);
        if (!printerErrorNotifiedRef.current) {
          printerErrorNotifiedRef.current = true;
          toast({
            title: "Falha ao imprimir etiqueta",
            description: "A bipagem foi aceita normalmente — só a etiqueta não saiu. Verifique se o QZ Tray está aberto.",
            variant: "destructive",
          });
        }
      });
  }

  function processScan(codeRaw: string) {
    const code = codeRaw.trim();
    if (!code) return;
    setScanCode("");

    const expected = packagesMap.get(code);
    if (!expected) {
      playScanError();
      pushFeed({ status: "not_found", trackingNumber: code });
      return;
    }

    if (scannedTodaySet.has(code) || scannedCodes.has(code)) {
      playScanWarning();
      pushFeed({ status: "duplicate", trackingNumber: code, city: expected.city, rota: expected.rota });
      return;
    }

    createScan.mutate(
      { data: { trackingNumber: code, operation: "LOGGI" } },
      {
        onSuccess: () => {
          playScanSuccess();
          setScannedCodes((prev) => new Set(prev).add(code));
          pushFeed({ status: expected.rota ? "success" : "no_route", trackingNumber: code, city: expected.city, rota: expected.rota });
          queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
          setTimeout(() => scanInputRef.current?.focus(), 50);
          printLabelFor(expected, code);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            playScanWarning();
            pushFeed({ status: "duplicate", trackingNumber: code, city: expected.city, rota: expected.rota });
            queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
            return;
          }
          playScanError();
          pushFeed({ status: "error", trackingNumber: code, city: expected.city });
          setTimeout(() => scanInputRef.current?.focus(), 50);
        },
      },
    );
  }

  const batchTotal = batch.length;
  const batchDone = batch.filter((b) => scannedCodes.has(b.trackingNumber) || scannedTodaySet.has(b.trackingNumber)).length;
  const batchNoRoute = batch.filter((b) => !b.rota).length;

  const routeChips = useMemo(() => {
    const counts = new Map<string, { total: number; done: number }>();
    batch.forEach((b) => {
      const key = b.rota ?? "Sem rota";
      const entry = counts.get(key) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (scannedCodes.has(b.trackingNumber) || scannedTodaySet.has(b.trackingNumber)) entry.done += 1;
      counts.set(key, entry);
    });
    return Array.from(counts.entries());
  }, [batch, scannedCodes, scannedTodaySet]);

  return (
    <div className="max-w-5xl mx-auto space-y-4 p-1">
      <div>
        <h1 className="text-xl font-semibold">Bipagem Automática</h1>
        <p className="text-sm text-muted-foreground">
          Importe a lista de pacotes da LOGGI com a rota já calculada por cidade — depois é só bipar, em qualquer ordem, que a
          etiqueta certa sai sozinha.
        </p>
      </div>

      {/* ---- Passo 1: Importar ---- */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                Importar lista de pacotes
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Arquivo com rastreio e cidade (com ou sem cabeçalho) — CEP e prazo de entrega são opcionais.
              </p>
            </div>
            <Badge variant="secondary">LOGGI</Badge>
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground cursor-pointer hover:bg-muted/40"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="h-5 w-5 mx-auto mb-2" />
            {fileName ? (
              <span>
                Arquivo: <strong className="text-foreground">{fileName}</strong> — clique para trocar
              </span>
            ) : (
              <span>Arraste a planilha aqui, ou clique para escolher o arquivo</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {previewRows.length > 0 && (
            <>
              <ScrollArea className="h-64 border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                      <th className="p-2">Rastreio</th>
                      <th className="p-2">Cidade</th>
                      <th className="p-2">Rota (auto)</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={`${row.trackingNumber}-${i}`} className={`border-b last:border-0 ${!row.rota ? "bg-amber-500/5" : ""}`}>
                        <td className="p-2 font-mono text-xs">{row.trackingNumber}</td>
                        <td className="p-2">{row.city}</td>
                        <td className="p-2">{row.rota ?? "—"}</td>
                        <td className="p-2">
                          {row.rota ? (
                            <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Rota OK
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Cidade sem rota mapeada
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              <div className="flex items-center justify-between flex-wrap gap-3 bg-muted/40 rounded-md px-4 py-3 text-sm">
                <span>
                  <strong>{readyCount}</strong> pacote(s) prontos para bipar
                  {warnCount > 0 && (
                    <>
                      {" "}
                      · <strong className="text-amber-700">{warnCount}</strong> cidade(s) sem rota mapeada — podem ser bipadas no
                      Pré-Sorter, modo Rota manual
                    </>
                  )}
                </span>
                <Button
                  onClick={handleLiberarBipagem}
                  disabled={cityRoutesLoading || bulkCreatePackages.isPending || previewRows.length === 0}
                >
                  {bulkCreatePackages.isPending ? "Importando..." : "Liberar bipagem →"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---- Passo 2: Bipagem ---- */}
      <Card className={step !== "scan" ? "opacity-50 pointer-events-none" : undefined}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                Bipagem
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bipe os pacotes em qualquer ordem — cada leitura já confirma no sistema e imprime a etiqueta certa.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Switch checked={printerEnabled} onCheckedChange={updatePrinterEnabled} id="printer-enabled" />
                <Label htmlFor="printer-enabled" className="text-xs font-normal flex items-center gap-1">
                  <Printer className="h-3.5 w-3.5" /> Imprimir etiqueta
                </Label>
              </div>
              {printerEnabled && (
                <Input
                  value={printerName}
                  onChange={(e) => updatePrinterName(e.target.value)}
                  placeholder="Nome da impressora"
                  className="h-7 w-32 text-xs"
                />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              ref={scanInputRef}
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") processScan(scanCode);
              }}
              placeholder="Bipe o próximo pacote..."
              className="font-mono"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="border rounded-md p-2 text-center bg-muted/30">
              <div className="text-lg font-bold font-mono">{batchTotal}</div>
              <div className="text-[11px] text-muted-foreground">Total</div>
            </div>
            <div className="border rounded-md p-2 text-center bg-muted/30">
              <div className="text-lg font-bold font-mono">{batchDone}</div>
              <div className="text-[11px] text-muted-foreground">Bipados</div>
            </div>
            <div className="border rounded-md p-2 text-center bg-muted/30">
              <div className="text-lg font-bold font-mono">{Math.max(0, batchTotal - batchDone)}</div>
              <div className="text-[11px] text-muted-foreground">Restantes</div>
            </div>
            <div className="border rounded-md p-2 text-center bg-muted/30">
              <div className="text-lg font-bold font-mono">{batchNoRoute}</div>
              <div className="text-[11px] text-muted-foreground">Sem rota</div>
            </div>
          </div>

          {routeChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {routeChips.map(([name, c]) => (
                <span key={name} className="text-[11px] border rounded-full px-2.5 py-1 text-muted-foreground">
                  {name}: <strong className="text-foreground">{c.done}/{c.total}</strong>
                </span>
              ))}
            </div>
          )}

          <ScrollArea className="h-72 border rounded-md">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                  <th className="p-2">Hora</th>
                  <th className="p-2">Rastreio</th>
                  <th className="p-2">Cidade</th>
                  <th className="p-2">Rota</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {feed.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Nenhuma bipagem ainda
                    </td>
                  </tr>
                )}
                {feed.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="p-2 text-xs text-muted-foreground font-mono">{entry.time}</td>
                    <td className="p-2 font-mono text-xs">{entry.trackingNumber}</td>
                    <td className="p-2">{entry.city ?? "—"}</td>
                    <td className="p-2">{entry.rota ?? "—"}</td>
                    <td className="p-2">
                      {entry.status === "success" && (
                        <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmado{printerEnabled ? " · impressa" : ""}
                        </Badge>
                      )}
                      {entry.status === "no_route" && (
                        <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Confirmado, sem etiqueta (rota desconhecida)
                        </Badge>
                      )}
                      {entry.status === "duplicate" && (
                        <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/15">
                          <ScanLine className="h-3 w-3 mr-1" /> Já bipado hoje
                        </Badge>
                      )}
                      {entry.status === "not_found" && (
                        <Badge variant="destructive">
                          <Ban className="h-3 w-3 mr-1" /> Não encontrado
                        </Badge>
                      )}
                      {entry.status === "error" && (
                        <Badge variant="destructive">
                          <Ban className="h-3 w-3 mr-1" /> Erro ao confirmar
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
