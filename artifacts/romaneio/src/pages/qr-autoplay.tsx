import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "react-qr-code";
import { customFetch, createScan, ApiError } from "@workspace/api-client-react";
import { useOperation } from "@/contexts/operation-context";
import { getTodayDateString, formatTime } from "@/lib/date-utils";
import { ROUTES } from "@/lib/routes-data";
import { useMotoristaAuth } from "@/contexts/motorista-auth-context";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  Maximize, Minimize, QrCode, CheckCircle2, ChevronLeft, Loader2,
  AlertTriangle,
} from "lucide-react";

interface RomaneioItem {
  trackingNumber: string;
  city: string;
  promisedDeliveryDate: string;
}

interface RomaneioData {
  city: string;
  date: string;
  totalCount: number;
  packages: RomaneioItem[];
}

async function fetchRomaneio(params: {
  cities?: string;
  label?: string;
  date: string;
  operation: string;
}): Promise<RomaneioData> {
  const url = new URL("/api/romaneio", window.location.origin);
  if (params.cities) url.searchParams.set("cities", params.cities);
  if (params.label) url.searchParams.set("label", params.label);
  url.searchParams.set("date", params.date);
  url.searchParams.set("operation", params.operation);
  return customFetch<RomaneioData>(url.toString());
}

const INTERVAL_OPTIONS = [
  { value: 1, label: "1 segundo" },
  { value: 2, label: "2 segundos" },
  { value: 3, label: "3 segundos" },
  { value: 5, label: "5 segundos" },
];

type Phase = "config" | "presenting" | "done";

export default function QrAutoplay() {
  const { operation } = useOperation();
  const { user: motoristaUser } = useMotoristaAuth();

  const allowedRouteCodes: string[] | undefined = motoristaUser?.allowedRoutes?.length
    ? motoristaUser.allowedRoutes
    : undefined;
  const filteredRoutes = allowedRouteCodes?.length
    ? ROUTES.filter((r) => allowedRouteCodes.some((code) => r.name.includes(code)))
    : ROUTES;

  const [phase, setPhase] = useState<Phase>("config");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [date, setDate] = useState(getTodayDateString());
  const [intervalSec, setIntervalSec] = useState(2);
  const [trackingNumbers, setTrackingNumbers] = useState<string[]>([]);
  const [routeLabel, setRouteLabel] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [registerScans, setRegisterScans] = useState(false);
  const [scannedSet, setScannedSet] = useState<Set<string>>(new Set());
  const [scanError, setScanError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentationRef = useRef<HTMLDivElement>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const registerCurrentScan = useCallback(
    async (trackingNumber: string) => {
      if (!trackingNumber) return;
      try {
        await createScan({ trackingNumber });
        setScannedSet((prev) => new Set(prev).add(trackingNumber));
        setScanError(null);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const data = error.data as { scannedBy?: string | null; scannedAt?: string | null } | null;
          const when = data?.scannedAt ? ` às ${formatTime(data.scannedAt)}` : "";
          const who = data?.scannedBy ? ` por ${data.scannedBy}` : "";
          setScanError(`${trackingNumber}: já bipado hoje${when}${who}`);
          return;
        }
        setScanError(`Falha ao registrar bipagem: ${trackingNumber}`);
      }
    },
    [],
  );

  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= trackingNumbers.length) {
        setIsPlaying(false);
        setPhase("done");
        return prev;
      }
      return next;
    });
  }, [trackingNumbers.length]);

  useEffect(() => {
    if (isPlaying && phase === "presenting") {
      stopTimer();
      timerRef.current = setTimeout(advance, intervalSec * 1000);
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [isPlaying, intervalSec, phase, advance, stopTimer, currentIndex]);

  useEffect(() => {
    if (phase !== "presenting" || !registerScans) return;
    const tn = trackingNumbers[currentIndex];
    if (tn && !scannedSet.has(tn)) {
      registerCurrentScan(tn);
    }
  }, [currentIndex, phase]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (phase !== "presenting") return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(prev + 1, trackingNumbers.length - 1));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, trackingNumbers.length]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleFetch = async () => {
    if (!selectedRoute || !date) return;
    setLoading(true);
    setError("");
    try {
      const routeObj = filteredRoutes.find((r) => r.name === selectedRoute);
      if (!routeObj) return;
      const data = await fetchRomaneio({
        cities: routeObj.cities.join(","),
        label: selectedRoute,
        date,
        operation,
      });
      if (data.packages.length === 0) {
        setError("Nenhum pacote bipado encontrado para essa rota e data.");
        return;
      }
      setTrackingNumbers(data.packages.map((p) => p.trackingNumber));
      setRouteLabel(data.city || selectedRoute);
      setError("");
    } catch {
      setError("Erro ao buscar pacotes. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setCurrentIndex(0);
    setIsPlaying(true);
    setScannedSet(new Set());
    setScanError(null);
    setPhase("presenting");
  };

  const handleRestart = () => {
    stopTimer();
    setCurrentIndex(0);
    setIsPlaying(false);
    setScannedSet(new Set());
    setScanError(null);
    setPhase("presenting");
  };

  const handleBackToConfig = () => {
    stopTimer();
    setIsPlaying(false);
    setPhase("config");
    setTrackingNumbers([]);
    setScannedSet(new Set());
    setScanError(null);
    setError("");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      presentationRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const prev = () => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };

  const next = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= trackingNumbers.length) {
      setIsPlaying(false);
      setPhase("done");
    } else {
      setCurrentIndex(nextIdx);
    }
  };

  const currentTracking = trackingNumbers[currentIndex] ?? "";
  const progress = trackingNumbers.length > 0
    ? ((currentIndex + 1) / trackingNumbers.length) * 100
    : 0;
  const isCurrentScanned = scannedSet.has(currentTracking);

  if (phase === "config") {
    return (
      <div className="space-y-8 max-w-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <QrCode className="h-8 w-8 text-primary" />
            Bipagem Auto QR
          </h1>
          <p className="text-muted-foreground mt-2">
            Exibe os QR codes dos rastreadores em slideshow para bipagem no sistema da transportadora.
          </p>
        </div>

        <div className="border rounded-xl p-6 space-y-5 bg-card">
          <div className="space-y-1.5">
            <Label className="font-semibold">Rota</Label>
            <Select value={selectedRoute} onValueChange={(v) => { setSelectedRoute(v); setTrackingNumbers([]); setError(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a rota..." />
              </SelectTrigger>
              <SelectContent>
                {filteredRoutes.map((r) => (
                  <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold">Data de Bipagem</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setTrackingNumbers([]); setError(""); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold">Intervalo entre QR codes</Label>
            <Select value={String(intervalSec)} onValueChange={(v) => setIntervalSec(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Checkbox
              id="register-scans"
              checked={registerScans}
              onCheckedChange={(v) => setRegisterScans(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="register-scans" className="font-medium cursor-pointer">
                Registrar bipagens no sistema ao avançar
              </Label>
              <p className="text-xs text-muted-foreground">
                Cada QR code exibido será marcado como bipado no sistema próprio automaticamente.
              </p>
            </div>
          </div>

          <Button
            onClick={handleFetch}
            disabled={!selectedRoute || !date || loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Buscando pacotes...</>
            ) : (
              "Buscar Pacotes"
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {trackingNumbers.length > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-green-800 font-medium">
                {trackingNumbers.length} pacote{trackingNumbers.length !== 1 ? "s" : ""} encontrado{trackingNumbers.length !== 1 ? "s" : ""}
              </span>
              <Badge variant="outline" className="text-green-700 border-green-300 bg-white">
                {routeLabel}
              </Badge>
            </div>
          )}

          <Button
            onClick={handleStart}
            disabled={trackingNumbers.length === 0}
            className="w-full h-12 text-base font-semibold"
          >
            <Play className="h-5 w-5 mr-2" />
            Iniciar Apresentação
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 px-1">
          <p className="font-medium">Atalhos de teclado na apresentação:</p>
          <p>Espaço — pausar / continuar &nbsp;·&nbsp; ← → — navegar</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold">Apresentação Concluída!</h2>
          <p className="text-muted-foreground text-center">
            Todos os <strong>{trackingNumbers.length}</strong> QR codes foram exibidos.
          </p>
          {registerScans && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-green-700">{scannedSet.size}</span> de {trackingNumbers.length} bipagens registradas no sistema.
            </p>
          )}
          <Badge variant="outline" className="text-base px-3 py-1">{routeLabel}</Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRestart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Repetir
          </Button>
          <Button onClick={handleBackToConfig}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Nova Seleção
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={presentationRef}
      className={`flex flex-col ${isFullscreen ? "min-h-screen bg-white" : "min-h-[calc(100vh-8rem)]"}`}
    >
      {/* Header bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isFullscreen ? "bg-white" : ""}`}>
        <button
          onClick={handleBackToConfig}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{routeLabel}</Badge>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {trackingNumbers.length}
          </span>
          {registerScans && scannedSet.size > 0 && (
            <Badge variant="outline" className="text-xs text-green-700 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {scannedSet.size} registrado{scannedSet.size !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>

      {/* Scan error banner */}
      {scanError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
          <span className="flex-1">{scanError}</span>
          <button
            onClick={() => setScanError(null)}
            className="text-yellow-600 hover:text-yellow-800 font-medium text-xs underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* QR Display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 px-4">
        <div className="relative p-6 bg-white rounded-2xl shadow-lg border">
          <QRCode
            value={currentTracking}
            size={isFullscreen ? 320 : 260}
            level="M"
          />
          {isCurrentScanned && registerScans && (
            <div className="absolute -top-3 -right-3 bg-green-500 rounded-full p-0.5 shadow-md">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="font-mono font-bold tracking-widest text-xl md:text-2xl text-foreground select-all">
            {currentTracking}
          </p>
          {registerScans && (
            <p className={`text-xs font-medium ${isCurrentScanned ? "text-green-600" : "text-muted-foreground"}`}>
              {isCurrentScanned ? "✓ Bipagem registrada" : "Registrando..."}
            </p>
          )}
        </div>
      </div>

      {/* Countdown bar */}
      <div className="px-6 pb-1">
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            key={currentIndex}
            className="h-full rounded-full bg-primary origin-left"
            style={{
              animationName: "qr-countdown",
              animationDuration: `${intervalSec}s`,
              animationTimingFunction: "linear",
              animationFillMode: "forwards",
              animationPlayState: isPlaying ? "running" : "paused",
            }}
          />
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 pb-2">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 pb-6 pt-2">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          onClick={handleRestart}
          title="Reiniciar"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          onClick={prev}
          disabled={currentIndex === 0}
          title="Anterior (←)"
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          size="lg"
          className="h-12 w-32 text-base font-semibold"
          onClick={() => setIsPlaying((p) => !p)}
          title="Pausar/Continuar (Espaço)"
        >
          {isPlaying ? (
            <><Pause className="h-5 w-5 mr-2" />Pausar</>
          ) : (
            <><Play className="h-5 w-5 mr-2" />Continuar</>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          onClick={next}
          title="Próximo (→)"
        >
          <SkipForward className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </Button>
      </div>

      {/* Interval badge */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        Intervalo: {intervalSec}s &nbsp;·&nbsp; Atalhos: Espaço (pausar) · ← → (navegar)
      </p>
    </div>
  );
}
