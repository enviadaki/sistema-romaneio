import { useState, useRef, useEffect, useMemo } from "react";
import {
  useListCities,
  getListCitiesQueryKey,
  useCreateScan,
  useBulkCreateScans,
  useListScans,
  getListScansQueryKey,
  useListPackages,
  getListPackagesQueryKey,
  getGetStatsQueryKey,
  customFetch,
  ApiError,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, formatTime } from "@/lib/date-utils";
import { useOperation } from "@/contexts/operation-context";
import { playScanSuccess, playScanError, playScanWarning } from "@/lib/scan-sounds";
import { ROUTES } from "@/lib/routes-data";
import {
  useCurrentScanSession,
  useOpenScanSession,
  useCloseScanSession,
  useScanEvents,
  useLogScanEvent,
  type ScanEventType,
} from "@/hooks/use-scan-session";
import { validateTbrFormat, tbrValidationMessage } from "@/lib/tbr";

import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, MapPin, Route, Zap, Calendar, Camera, PackageOpen, Lock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CameraScanner } from "@/components/camera-scanner";

type FilterMode = "cidade" | "rota";
type ScanStatus = "success" | "error" | "warning";

interface ScanResult {
  status: ScanStatus;
  message: string;
  trackingNumber?: string;
  city?: string;
}

export default function PreSorter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { operation } = useOperation();
  const today = getTodayDateString();
  const [filterMode, setFilterMode] = useState<FilterMode>("rota");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Passo 4a: só a AMAZON usa sessão/lote de bipagem — a LOGGI continua
  // bipando exatamente como antes, sem sessão nenhuma.
  const usesSession = operation === "AMAZON";
  const { data: currentSession, isLoading: sessionLoading } = useCurrentScanSession(operation, {
    enabled: usesSession,
  });
  const openSession = useOpenScanSession();
  const closeSession = useCloseScanSession();
  const sessionId = usesSession ? currentSession?.id ?? null : null;

  // Passo 4b: indicadores em tempo real da sessão aberta. Zera sempre que a
  // sessão muda (abriu uma nova, ou fechou) — os contadores são por sessão,
  // não acumulam entre sessões diferentes.
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    accepted: 0,
    duplicate: 0,
    notFound: 0,
    invalidFormat: 0,
    otherErrors: 0,
  });
  useEffect(() => {
    setSessionStats({ total: 0, accepted: 0, duplicate: 0, notFound: 0, invalidFormat: 0, otherErrors: 0 });
  }, [sessionId]);
  const bumpStat = (key: keyof typeof sessionStats) => {
    setSessionStats((prev) => ({ ...prev, total: prev.total + 1, [key]: prev[key] + 1 }));
  };
  // Só registra a ocorrência (pra relação consultável) quando a operação usa
  // sessão — hoje só a AMAZON. Fire-and-forget: nunca trava a bipagem.
  const logEvent = (trackingNumber: string, eventType: ScanEventType) => {
    if (!usesSession) return;
    logScanEvent.mutate({ sessionId, operation, trackingNumber, eventType });
  };

  // Relação de ocorrências (não só o número) — pedido logo após o Passo 4b.
  const logScanEvent = useLogScanEvent();
  const { data: scanEvents } = useScanEvents(sessionId, operation);
  const [eventsDialogType, setEventsDialogType] = useState<ScanEventType | null>(null);
  const eventsDialogLabels: Record<ScanEventType, string> = {
    duplicate: "Pacotes bipados duplicados",
    not_found: "Pacotes não encontrados",
    invalid_format: "Códigos fora do padrão",
    other_error: "Outros erros",
  };

  const { data: cities } = useListCities({
    query: {
      queryKey: [...getListCitiesQueryKey(), operation],
      queryFn: () => customFetch<string[]>(`/api/cities?operation=${operation}`),
    },
  });

  // Derived: cities for the selected route
  const routeCities = useMemo(() => {
    if (filterMode !== "rota" || !selectedRoute) return [];
    return ROUTES.find((r) => r.name === selectedRoute)?.cities ?? [];
  }, [filterMode, selectedRoute]);

  // Build cities query param (comma-separated for route mode)
  const citiesParam = useMemo(() => {
    if (filterMode === "rota") return routeCities.join(",");
    return selectedCity;
  }, [filterMode, routeCities, selectedCity]);

  const isReady = filterMode === "cidade" ? !!selectedCity : !!selectedRoute;
  // Além de escolher rota/cidade, a AMAZON também precisa ter uma sessão
  // aberta antes de liberar a bipagem (Passo 4a). A LOGGI não usa isso.
  const canScan = isReady && (!usesSession || !!sessionId);

  // Fetch packages for all cities in route (or single city)
  const { data: packages } = useListPackages(
    filterMode === "rota" ? ({} as any) : { city: selectedCity, operation },
    {
      query: {
        queryKey: [...getListPackagesQueryKey(), citiesParam, operation],
        enabled: isReady,
        queryFn: async () => {
          if (!citiesParam) return [];
          const url =
            filterMode === "rota"
              ? `/api/packages?cities=${encodeURIComponent(citiesParam)}&operation=${operation}`
              : `/api/packages?city=${encodeURIComponent(selectedCity)}&operation=${operation}`;
          return customFetch<any[]>(url);
        },
      },
    },
  );

  // Fetch scans for all cities in route (or single city) + today
  const { data: scans } = useListScans(
    filterMode === "cidade" ? { city: selectedCity, date: today, operation } : ({} as any),
    {
      query: {
        queryKey: [...getListScansQueryKey(), citiesParam, today, operation],
        enabled: isReady,
        queryFn: async () => {
          if (!citiesParam) return [];
          const url =
            filterMode === "rota"
              ? `/api/scans?cities=${encodeURIComponent(citiesParam)}&date=${today}&operation=${operation}`
              : `/api/scans?city=${encodeURIComponent(selectedCity)}&date=${today}&operation=${operation}`;
          return customFetch<any[]>(url);
        },
      },
    },
  );

  const createScan = useCreateScan();
  const bulkCreateScans = useBulkCreateScans();

  const handleAutoRegister = () => {
    if (!pendingPackages.length) return;
    bulkCreateScans.mutate(
      {
        data: {
          trackingNumbers: pendingPackages.map((p: any) => p.trackingNumber),
          operation,
          sessionId,
        },
      },
      {
        onSuccess: (res) => {
          toast({
            title: "Romaneio gerado automaticamente",
            description: `${res.created} pacote${res.created !== 1 ? "s" : ""} registrado${res.created !== 1 ? "s" : ""}${res.skipped > 0 ? `, ${res.skipped} ignorado${res.skipped !== 1 ? "s" : ""}` : ""}.`,
          });
          setAutoOpen(false);
          queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        },
        onError: () => {
          toast({ title: "Erro ao registrar pacotes automaticamente.", variant: "destructive" });
        },
      }
    );
  };

  useEffect(() => {
    if (canScan && inputRef.current) inputRef.current.focus();
  }, [canScan, selectedCity, selectedRoute]);

  // Reset selection when switching modes
  useEffect(() => {
    setSelectedCity("");
    setSelectedRoute("");
    setScanResult(null);
  }, [filterMode]);

  // "às 14:32 por João Silva" — sufixo usado nas duas mensagens de
  // duplicidade (a checagem local e a resposta 409 do servidor), pra dizer
  // ao operador quando e por quem a bipagem original aconteceu.
  const describeDuplicate = (scannedBy?: string | null, scannedAt?: string | null): string => {
    const when = scannedAt ? ` às ${formatTime(scannedAt)}` : "";
    const who = scannedBy ? ` por ${scannedBy}` : "";
    return `Pacote já bipado hoje${when}${who}`;
  };

  const triggerResult = (result: ScanResult) => {
    setScanResult(result);
    if (result.status === "success") playScanSuccess();
    else if (result.status === "warning") playScanWarning();
    else playScanError();
  };

  const processCode = (code: string) => {
    if (!code || !canScan) return;

    // Passo 4b: na AMAZON, código fora do padrão TBR nem chega a procurar
    // pacote — é rejeitado na hora, com indicador próprio (distinto de
    // "não encontrado").
    if (usesSession) {
      const tbrCheck = validateTbrFormat(code);
      if (!tbrCheck.valid) {
        bumpStat("invalidFormat");
        logEvent(code, "invalid_format");
        triggerResult({
          status: "error",
          message: tbrValidationMessage(tbrCheck.reason),
          trackingNumber: code,
        });
        return;
      }
    }

    const expectedPkg = packages?.find((p: any) => p.trackingNumber === code);
    if (!expectedPkg) {
      const label =
        filterMode === "rota"
          ? `rota ${selectedRoute}`
          : `cidade ${selectedCity}`;
      bumpStat("notFound");
      logEvent(code, "not_found");
      triggerResult({
        status: "error",
        message: `Pacote não encontrado para ${label}`,
        trackingNumber: code,
      });
      return;
    }

    const alreadyScanned = scans?.find((s: any) => s.trackingNumber === code);
    if (alreadyScanned) {
      bumpStat("duplicate");
      logEvent(code, "duplicate");
      triggerResult({
        status: "warning",
        message: describeDuplicate(alreadyScanned.scannedBy, alreadyScanned.scannedAt),
        trackingNumber: code,
        city: expectedPkg.city,
      });
      return;
    }

    createScan.mutate(
      { data: { trackingNumber: code, operation, sessionId } },
      {
        onSuccess: () => {
          bumpStat("accepted");
          triggerResult({
            status: "success",
            message: `Scan confirmado`,
            trackingNumber: code,
            city: expectedPkg.city,
          });
          queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          setTimeout(() => inputRef.current?.focus(), 100);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            playScanWarning();
            bumpStat("duplicate");
            logEvent(code, "duplicate");
            const data = error.data as { scannedBy?: string | null; scannedAt?: string | null } | null;
            triggerResult({
              status: "warning",
              message: describeDuplicate(data?.scannedBy, data?.scannedAt),
              trackingNumber: code,
              city: expectedPkg.city,
            });
            queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
            return;
          }
          if (error instanceof ApiError && error.status === 404) {
            bumpStat("notFound");
            logEvent(code, "not_found");
            triggerResult({
              status: "error",
              message: "Rastreio não encontrado na base",
              trackingNumber: code,
            });
            return;
          }
          bumpStat("otherErrors");
          logEvent(code, "other_error");
          triggerResult({
            status: "error",
            message: "Erro ao registrar bipagem",
            trackingNumber: code,
          });
        },
      },
    );
  };

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = scanInput.trim();
    setScanInput("");
    processCode(code);
  };

  const handleCameraScan = (code: string) => {
    processCode(code);
  };

  const statusConfig = {
    success: {
      bg: "bg-green-50 border-green-200 text-green-900",
      icon: <CheckCircle2 className="h-7 w-7 text-green-500 flex-shrink-0" />,
      label: "CONFIRMADO",
      labelColor: "text-green-600",
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-900",
      icon: <XCircle className="h-7 w-7 text-red-500 flex-shrink-0" />,
      label: "ERRO",
      labelColor: "text-red-600",
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200 text-yellow-900",
      icon: <AlertCircle className="h-7 w-7 text-yellow-500 flex-shrink-0" />,
      label: "ATENÇÃO",
      labelColor: "text-yellow-600",
    },
  };

  // Group confirmed scans by city for route mode
  const scansByCity = useMemo(() => {
    if (!scans || filterMode !== "rota") return null;
    const map: Record<string, typeof scans> = {};
    for (const s of scans as any[]) {
      if (!map[s.city]) map[s.city] = [];
      map[s.city].push(s);
    }
    return map;
  }, [scans, filterMode]);

  const pendingPackages = useMemo(() => {
    if (!packages) return [];
    const scannedSet = new Set((scans as any[] | undefined)?.map((s: any) => s.trackingNumber) ?? []);
    return (packages as any[]).filter((p: any) => !scannedSet.has(p.trackingNumber));
  }, [packages, scans]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pré-Sorter (Bipagem)</h1>
          <p className="text-muted-foreground mt-2">
            Biper pacotes para gerar o romaneio da rota ou cidade.
          </p>
        </div>
        <span className={`mt-1 shrink-0 text-sm font-bold px-3 py-1 rounded-full border ${
          operation === "LOGGI"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-orange-50 text-orange-700 border-orange-200"
        }`}>
          {operation}
        </span>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6 space-y-6">
          {/* Mode toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">1. Filtrar por</label>
            <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="rota" className="flex-1 gap-2">
                  <Route className="h-4 w-4" />
                  Rota
                </TabsTrigger>
                <TabsTrigger value="cidade" className="flex-1 gap-2">
                  <MapPin className="h-4 w-4" />
                  Cidade
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Route or City selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {filterMode === "rota" ? "2. Selecione a Rota" : "2. Selecione a Cidade"}
            </label>

            {filterMode === "rota" ? (
              <>
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger className="text-lg py-6">
                    <SelectValue placeholder="Selecione a rota..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ROUTES.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        <span className="font-medium">{r.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({r.cities.length} cidades)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRoute && routeCities.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {routeCities.slice(0, 8).map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                    {routeCities.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{routeCities.length - 8} mais
                      </Badge>
                    )}
                  </div>
                )}
              </>
            ) : (
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="text-lg py-6">
                  <SelectValue placeholder="Selecione a cidade..." />
                </SelectTrigger>
                <SelectContent>
                  {cities?.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Sessão de bipagem (só AMAZON — Passo 4a) */}
          {usesSession && isReady && (
            <div className="space-y-2">
              <div
                className={`flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 ${
                  currentSession
                    ? "border-orange-200 bg-orange-50"
                    : "border-dashed border-muted-foreground/30 bg-muted/30"
                }`}
              >
                {currentSession ? (
                  <>
                    <div className="flex items-center gap-2 text-orange-800">
                      <PackageOpen className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        Sessão aberta{currentSession.openedBy ? ` por ${currentSession.openedBy}` : ""}
                        {" "}às {formatTime(currentSession.openedAt)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-800 hover:bg-orange-100"
                      disabled={closeSession.isPending}
                      onClick={() =>
                        closeSession.mutate(currentSession, {
                          onSuccess: () => {
                            toast({ title: "Sessão encerrada" });
                          },
                          onError: () => {
                            toast({ title: "Erro ao encerrar sessão", variant: "destructive" });
                          },
                        })
                      }
                    >
                      Encerrar sessão
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        Abra uma sessão para começar a bipar
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={openSession.isPending || sessionLoading}
                      onClick={() =>
                        openSession.mutate(operation, {
                          onError: () => {
                            toast({ title: "Erro ao abrir sessão", variant: "destructive" });
                          },
                        })
                      }
                    >
                      Abrir sessão
                    </Button>
                  </>
                )}
              </div>

              {/* Passo 4b: indicadores em tempo real da sessão aberta */}
              {currentSession && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div className="rounded-md border bg-card px-2 py-2 text-center">
                    <div className="text-xl font-bold tabular-nums">{sessionStats.total}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">Total</div>
                  </div>
                  <div className="rounded-md border border-green-200 bg-green-50 px-2 py-2 text-center">
                    <div className="text-xl font-bold tabular-nums text-green-700">{sessionStats.accepted}</div>
                    <div className="text-[11px] text-green-700 leading-tight">Aceito</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEventsDialogType("duplicate")}
                    className="rounded-md border border-yellow-200 bg-yellow-50 px-2 py-2 text-center hover:bg-yellow-100 transition-colors"
                  >
                    <div className="text-xl font-bold tabular-nums text-yellow-700">{sessionStats.duplicate}</div>
                    <div className="text-[11px] text-yellow-700 leading-tight">Duplicado</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventsDialogType("not_found")}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-center hover:bg-red-100 transition-colors"
                  >
                    <div className="text-xl font-bold tabular-nums text-red-700">{sessionStats.notFound}</div>
                    <div className="text-[11px] text-red-700 leading-tight">Não encontrado</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventsDialogType("invalid_format")}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-center hover:bg-red-100 transition-colors"
                  >
                    <div className="text-xl font-bold tabular-nums text-red-700">{sessionStats.invalidFormat}</div>
                    <div className="text-[11px] text-red-700 leading-tight">Fora do padrão</div>
                  </button>
                  {sessionStats.otherErrors > 0 && (
                    <button
                      type="button"
                      onClick={() => setEventsDialogType("other_error")}
                      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-center hover:bg-gray-100 transition-colors"
                    >
                      <div className="text-xl font-bold tabular-nums text-gray-700">{sessionStats.otherErrors}</div>
                      <div className="text-[11px] text-gray-700 leading-tight">Outros erros</div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Barcode input */}
          <div
            className={`transition-opacity duration-300 ${canScan ? "opacity-100" : "opacity-50 pointer-events-none"}`}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">3. Bipar Rastreador</label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleScan}
                  placeholder={
                    canScan
                      ? "Escaneie o código ou digite e pressione Enter..."
                      : !isReady
                        ? `Selecione uma ${filterMode === "rota" ? "rota" : "cidade"} primeiro`
                        : "Abra uma sessão para começar a bipar"
                  }
                  className="text-2xl py-8 font-mono tracking-wider"
                  disabled={!canScan || createScan.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-auto px-4 py-8 border-2 border-primary/30 hover:border-primary hover:bg-primary/5"
                  disabled={!canScan}
                  onClick={() => setCameraOpen(true)}
                  title="Escanear via câmera"
                >
                  <Camera className="h-7 w-7" />
                </Button>
              </div>
            </div>
          </div>

          <CameraScanner
            open={cameraOpen}
            onClose={() => setCameraOpen(false)}
            onScan={handleCameraScan}
          />

          {/* Relação de ocorrências da sessão (duplicado / não encontrado /
              fora do padrão / outros erros) — pedido logo após o Passo 4b */}
          <Dialog open={eventsDialogType !== null} onOpenChange={(open) => !open && setEventsDialogType(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{eventsDialogType ? eventsDialogLabels[eventsDialogType] : ""}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[350px] pr-4">
                {(() => {
                  const filtered = (scanEvents ?? []).filter((e) => e.eventType === eventsDialogType);
                  if (filtered.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-4">
                        Nada registrado nessa categoria ainda nesta sessão.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {filtered.map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                          <span className="font-mono text-sm">{e.trackingNumber}</span>
                          <span className="text-xs text-muted-foreground text-right">
                            {formatTime(e.createdAt)}
                            {e.scannedBy ? ` · ${e.scannedBy}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Feedback visual + sonoro */}
          {scanResult &&
            (() => {
              const cfg = statusConfig[scanResult.status];
              return (
                <div className={`p-4 rounded-lg border-2 flex items-center gap-4 ${cfg.bg}`}>
                  {cfg.icon}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold tracking-widest ${cfg.labelColor}`}>
                      {cfg.label}
                    </p>
                    <p className="font-mono font-bold text-lg leading-tight truncate">
                      {scanResult.trackingNumber}
                    </p>
                    <p className="text-sm mt-0.5 opacity-80">{scanResult.message}</p>
                    {scanResult.city && scanResult.status === "success" && (
                      <p className="text-xs mt-1 flex items-center gap-1 opacity-70">
                        <MapPin className="h-3 w-3" />
                        {scanResult.city}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
        </CardContent>
      </Card>

      {isReady && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Confirmed */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex justify-between">
                <span>Confirmados (Hoje)</span>
                <span className="text-primary font-bold">{(scans as any[])?.length || 0}</span>
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                {filterMode === "rota" && scansByCity ? (
                  <div className="space-y-4">
                    {Object.entries(scansByCity).map(([city, cityScans]) => (
                      <div key={city}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {city} ({cityScans.length})
                        </p>
                        <div className="space-y-1">
                          {cityScans.map((s: any) => (
                            <div
                              key={s.id}
                              className="flex justify-between items-center p-2 rounded border bg-card text-sm"
                            >
                              <span className="font-mono">{s.trackingNumber}</span>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {(scans as any[])?.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum pacote bipado hoje.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(scans as any[])?.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex justify-between items-center p-2 rounded border bg-card text-sm"
                      >
                        <span className="font-mono">{s.trackingNumber}</span>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                    {(scans as any[])?.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum pacote bipado hoje.
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span>Faltantes (Esperados)</span>
                  <span className="text-muted-foreground font-bold text-base">{pendingPackages.length}</span>
                </h3>
                {pendingPackages.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50"
                    onClick={() => setAutoOpen(true)}
                  >
                    <Zap className="h-4 w-4" />
                    Gerar Automático
                  </Button>
                )}
              </div>

              {/* Auto-register dialog */}
              <Dialog open={autoOpen} onOpenChange={setAutoOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Gerar Romaneio Automaticamente
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Esta ação vai registrar <strong>{pendingPackages.length} pacote{pendingPackages.length !== 1 ? "s" : ""}</strong>{" "}
                      {filterMode === "rota"
                        ? `da rota "${selectedRoute}"`
                        : `da cidade "${selectedCity}"`}{" "}
                      como bipados, sem necessidade de leitura física do código de barras.
                    </p>

                    {filterMode === "rota" && pendingPackages.length > 0 && (
                      <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                        {Object.entries(
                          (pendingPackages as any[]).reduce<Record<string, number>>((acc, p) => {
                            acc[p.city] = (acc[p.city] ?? 0) + 1;
                            return acc;
                          }, {})
                        ).map(([city, count]) => (
                          <div key={city} className="flex justify-between">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />{city}
                            </span>
                            <span className="font-medium">{count} pacote{count !== 1 ? "s" : ""}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setAutoOpen(false)}
                        disabled={bulkCreateScans.isPending}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={handleAutoRegister}
                        disabled={bulkCreateScans.isPending}
                      >
                        <Zap className="h-4 w-4" />
                        {bulkCreateScans.isPending ? "Registrando..." : "Confirmar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {pendingPackages.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3 rounded border border-dashed bg-muted/30 text-sm space-y-1.5"
                    >
                      <span className="font-mono text-sm font-semibold break-all block">
                        {p.trackingNumber}
                      </span>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {p.city}
                        </span>
                        {p.promisedDeliveryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            Entrega: {p.promisedDeliveryDate}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {pendingPackages.length === 0 && (scans as any[])?.length > 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Todos os pacotes foram bipados! 🎉
                    </p>
                  )}
                  {pendingPackages.length === 0 && (!(scans as any[])?.length) && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum pacote cadastrado para esta{" "}
                      {filterMode === "rota" ? "rota" : "cidade"}.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
