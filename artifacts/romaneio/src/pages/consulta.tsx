import { useState, useRef, useCallback } from "react";
import { customFetch } from "@workspace/api-client-react";
import { useOperation } from "@/contexts/operation-context";
import { ROUTES } from "@/lib/routes-data";
import { CameraScanner } from "@/components/camera-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Camera,
  Package,
  MapPin,
  Route,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";

interface LookupResult {
  id: number;
  trackingNumber: string;
  city: string;
  promisedDeliveryDate: string | null;
  createdAt: string;
  scannedToday: boolean;
  scannedAt: string | null;
  scannedBy: string | null;
}

function findRouteForCity(city: string): string | null {
  const lower = city.toLowerCase();
  for (const route of ROUTES) {
    if (route.cities.some((c) => c.toLowerCase() === lower)) {
      return route.name;
    }
  }
  return null;
}

export default function Consulta() {
  const { operation } = useOperation();
  const [input, setInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null | "not_found">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookup = useCallback(async (trackingNumber: string) => {
    const code = trackingNumber.trim();
    if (!code) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await customFetch<LookupResult>(
        `/api/packages/lookup?trackingNumber=${encodeURIComponent(code)}&operation=${operation}`
      );
      setResult(data);
    } catch {
      setResult("not_found");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    lookup(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      lookup(input);
    }
  };

  const handleCameraScan = (code: string) => {
    setCameraOpen(false);
    setInput(code);
    lookup(code);
  };

  const pkg = result && result !== "not_found" ? result : null;
  const route = pkg ? findRouteForCity(pkg.city) : null;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consulta de Pacotes</h1>
        <p className="text-muted-foreground mt-2">
          Busque informações de um pacote pelo número de rastreio.
        </p>
      </div>

      {/* Search bar */}
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6 space-y-4">
          <label className="text-sm font-medium">Número de Rastreio</label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite ou escaneie o rastreador..."
              className="text-lg py-6 font-mono"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <Button
              type="button"
              variant="outline"
              className="h-auto px-4 border-2 border-primary/30 hover:border-primary hover:bg-primary/5"
              onClick={() => setCameraOpen(true)}
              title="Escanear via câmera"
            >
              <Camera className="h-6 w-6" />
            </Button>
          </div>
          <Button
            className="w-full gap-2"
            onClick={handleSearch}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </CardContent>
      </Card>

      {/* Not found */}
      {result === "not_found" && (
        <Card className="border-red-200">
          <CardContent className="pt-6 flex flex-col items-center gap-3 text-center py-10">
            <XCircle className="h-12 w-12 text-red-400" />
            <p className="font-semibold text-red-700">Pacote não encontrado</p>
            <p className="text-sm text-muted-foreground">
              Nenhum pacote cadastrado com o rastreador{" "}
              <span className="font-mono font-semibold">{input}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {pkg && (
        <Card className="border-2 border-primary/10">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary flex-shrink-0" />
                <CardTitle className="text-base font-mono break-all">
                  {pkg.trackingNumber}
                </CardTitle>
              </div>
              {pkg.scannedToday ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Bipado hoje
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex-shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendente
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {/* City */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Cidade de Destino</p>
                  <p className="font-semibold">{pkg.city}</p>
                </div>
              </div>

              {/* Route */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Route className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Rota</p>
                  {route ? (
                    <p className="font-semibold">{route}</p>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      Cidade não mapeada em nenhuma rota
                    </p>
                  )}
                </div>
              </div>

              {/* Promised date */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Data Prometida</p>
                  <p className="font-semibold">
                    {pkg.promisedDeliveryDate ?? (
                      <span className="text-muted-foreground font-normal text-sm italic">
                        Não informada
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Scan info */}
              {pkg.scannedToday && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-green-700">Bipado hoje às</p>
                    <p className="font-semibold text-green-800">
                      {pkg.scannedAt
                        ? new Date(pkg.scannedAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                      {pkg.scannedBy && (
                        <span className="font-normal text-sm text-green-700 ml-2">
                          por {pkg.scannedBy}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={handleCameraScan}
      />
    </div>
  );
}
