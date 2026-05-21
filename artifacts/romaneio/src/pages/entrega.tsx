import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ROUTES } from "@/lib/routes-data";
import { CameraScanner } from "@/components/camera-scanner";
import { getTodayDateString } from "@/lib/date-utils";
import { useOperation } from "@/contexts/operation-context";
import { playScanSuccess, playScanError, playScanWarning } from "@/lib/scan-sounds";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
  MapPin,
  Route,
  Truck,
  Package,
} from "lucide-react";

type ScanStatus = "success" | "error" | "warning";

interface ScanResult {
  status: ScanStatus;
  message: string;
  trackingNumber?: string;
  city?: string;
}

interface ConfirmedDelivery {
  id: number;
  trackingNumber: string;
  city: string;
  deliveredBy: string | null;
  deliveredAt: string;
}

interface PackageInfo {
  id: number;
  trackingNumber: string;
  city: string;
  promisedDeliveryDate: string | null;
}

export default function Entrega() {
  const today = getTodayDateString();
  const { operation } = useOperation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedRoute, setSelectedRoute] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [routePackages, setRoutePackages] = useState<PackageInfo[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedDelivery[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const routeCities = useMemo(() => {
    if (!selectedRoute) return [];
    return ROUTES.find((r) => r.name === selectedRoute)?.cities ?? [];
  }, [selectedRoute]);

  // Fetch packages + confirmed deliveries whenever route changes
  const loadRouteData = useCallback(async (route: string, cities: string[]) => {
    if (!route || cities.length === 0) return;
    setLoadingData(true);
    try {
      const [pkgRes, delivRes] = await Promise.all([
        fetch(`/api/packages?cities=${encodeURIComponent(cities.join(","))}&operation=${operation}`, {
          credentials: "include",
        }),
        fetch(
          `/api/deliveries/summary?route=${encodeURIComponent(route)}&date=${today}&operation=${operation}`,
          { credentials: "include" }
        ),
      ]);
      if (pkgRes.ok) setRoutePackages(await pkgRes.json());
      if (delivRes.ok) {
        const data = await delivRes.json();
        setConfirmed(data.confirmed ?? []);
      }
    } finally {
      setLoadingData(false);
    }
  }, [today, operation]);

  useEffect(() => {
    if (selectedRoute && routeCities.length > 0) {
      setRoutePackages([]);
      setConfirmed([]);
      setScanResult(null);
      loadRouteData(selectedRoute, routeCities);
    }
  }, [selectedRoute, routeCities, loadRouteData]);

  useEffect(() => {
    if (selectedRoute && inputRef.current) inputRef.current.focus();
  }, [selectedRoute]);

  const confirmedSet = useMemo(
    () => new Set(confirmed.map((d) => d.trackingNumber)),
    [confirmed]
  );

  const pendingPackages = useMemo(
    () => routePackages.filter((p) => !confirmedSet.has(p.trackingNumber)),
    [routePackages, confirmedSet]
  );

  const triggerResult = (result: ScanResult) => {
    setScanResult(result);
    if (result.status === "success") playScanSuccess();
    else if (result.status === "warning") playScanWarning();
    else playScanError();
  };

  const processCode = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code || !selectedRoute) return;

      // Check if belongs to route
      const pkg = routePackages.find((p) => p.trackingNumber === code);
      if (!pkg) {
        triggerResult({
          status: "error",
          message: `Pacote não encontrado na rota ${selectedRoute}`,
          trackingNumber: code,
        });
        return;
      }

      // Check if already confirmed
      if (confirmedSet.has(code)) {
        triggerResult({
          status: "warning",
          message: "Entrega já confirmada para este pacote hoje",
          trackingNumber: code,
          city: pkg.city,
        });
        return;
      }

      try {
        const res = await fetch("/api/deliveries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ trackingNumber: code, route: selectedRoute }),
        });

        if (res.status === 409) {
          triggerResult({
            status: "warning",
            message: "Entrega já confirmada para este pacote hoje",
            trackingNumber: code,
            city: pkg.city,
          });
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          triggerResult({
            status: "error",
            message: err.error ?? "Erro ao confirmar entrega",
            trackingNumber: code,
          });
          return;
        }

        const delivery: ConfirmedDelivery = await res.json();
        setConfirmed((prev) => [...prev, delivery]);
        triggerResult({
          status: "success",
          message: "Entrega confirmada!",
          trackingNumber: code,
          city: pkg.city,
        });
        setTimeout(() => inputRef.current?.focus(), 100);
      } catch {
        triggerResult({
          status: "error",
          message: "Erro de conexão. Tente novamente.",
          trackingNumber: code,
        });
      }
    },
    [selectedRoute, routePackages, confirmedSet]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = scanInput.trim();
    setScanInput("");
    processCode(code);
  };

  const handleCameraScan = (code: string) => {
    setCameraOpen(false);
    processCode(code);
  };

  const pct =
    routePackages.length > 0
      ? Math.round((confirmed.length / routePackages.length) * 100)
      : 0;
  const isComplete = routePackages.length > 0 && confirmed.length >= routePackages.length;

  const statusConfig = {
    success: {
      bg: "bg-green-50 border-green-200 text-green-900",
      icon: <CheckCircle2 className="h-7 w-7 text-green-500 flex-shrink-0" />,
      label: "ENTREGUE",
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          Checagem de Entrega
        </h1>
        <p className="text-muted-foreground mt-2">
          Confirme a entrega dos pacotes ao final da rota.
        </p>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6 space-y-6">
          {/* Route selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Route className="h-4 w-4" />
              1. Selecione sua Rota
            </label>
            <Select
              value={selectedRoute}
              onValueChange={(v) => {
                setSelectedRoute(v);
                setScanResult(null);
              }}
            >
              <SelectTrigger className="text-lg py-6">
                <SelectValue placeholder="Selecione a rota..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {ROUTES.map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    <span className="font-medium">{r.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          {selectedRoute && routePackages.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {isComplete ? (
                    <span className="text-green-700 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Rota completa!
                    </span>
                  ) : (
                    "Progresso"
                  )}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {confirmed.length}/{routePackages.length} —{" "}
                  <span
                    className={
                      isComplete ? "text-green-600 font-bold" : "text-primary font-bold"
                    }
                  >
                    {pct}%
                  </span>
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete ? "bg-green-500" : "bg-primary"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Scan input */}
          <div
            className={`transition-opacity duration-300 ${
              selectedRoute ? "opacity-100" : "opacity-40 pointer-events-none"
            }`}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">2. Bipar Pacote Entregue</label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedRoute
                      ? "Escaneie o código ou digite e pressione Enter..."
                      : "Selecione a rota primeiro"
                  }
                  className="text-2xl py-8 font-mono tracking-wider"
                  disabled={!selectedRoute}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto px-4 py-8 border-2 border-primary/30 hover:border-primary hover:bg-primary/5"
                  disabled={!selectedRoute}
                  onClick={() => setCameraOpen(true)}
                  title="Escanear via câmera"
                >
                  <Camera className="h-7 w-7" />
                </Button>
              </div>
            </div>
          </div>

          {/* Feedback */}
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
                    {scanResult.city && (
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

      {/* Package lists */}
      {selectedRoute && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Confirmed */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Entregues Hoje
                </span>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  {confirmed.length}
                </Badge>
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {confirmed.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Nenhuma entrega confirmada ainda.
                    </p>
                  )}
                  {[...confirmed].reverse().map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start justify-between p-2 rounded border bg-green-50/60 border-green-100 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-sm break-all block">
                          {d.trackingNumber}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {d.city}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2 flex-shrink-0">
                        {new Date(d.deliveredAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  Pendentes
                </span>
                <Badge variant="secondary">{pendingPackages.length}</Badge>
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {loadingData && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Carregando pacotes...
                    </p>
                  )}
                  {!loadingData && pendingPackages.length === 0 && routePackages.length > 0 && (
                    <p className="text-center text-green-700 py-8 text-sm font-medium">
                      Todos os pacotes foram entregues! 🎉
                    </p>
                  )}
                  {!loadingData && routePackages.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Nenhum pacote cadastrado para esta rota.
                    </p>
                  )}
                  {pendingPackages.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded border border-dashed bg-muted/30 text-sm"
                    >
                      <span className="font-mono font-semibold text-sm break-all block">
                        {p.trackingNumber}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {p.city}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={handleCameraScan}
      />
    </div>
  );
}
