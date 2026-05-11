import { useState, useRef, useEffect } from "react";
import {
  useListCities,
  getListCitiesQueryKey,
  useCreateScan,
  useListScans,
  getListScansQueryKey,
  useListPackages,
  getListPackagesQueryKey,
  getGetStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getTodayDateString } from "@/lib/date-utils";
import { playScanSuccess, playScanError, playScanWarning } from "@/lib/scan-sounds";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type ScanStatus = "success" | "error" | "warning";

interface ScanResult {
  status: ScanStatus;
  message: string;
  trackingNumber?: string;
}

export default function PreSorter() {
  const queryClient = useQueryClient();
  const today = getTodayDateString();

  const [selectedCity, setSelectedCity] = useState<string>("");
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: cities } = useListCities({
    query: { queryKey: getListCitiesQueryKey() },
  });

  const { data: scans } = useListScans(
    { city: selectedCity, date: today },
    {
      query: {
        queryKey: getListScansQueryKey({ city: selectedCity, date: today }),
        enabled: !!selectedCity,
      },
    },
  );

  const { data: packages } = useListPackages(
    { city: selectedCity },
    {
      query: {
        queryKey: getListPackagesQueryKey({ city: selectedCity }),
        enabled: !!selectedCity,
      },
    },
  );

  const createScan = useCreateScan();

  useEffect(() => {
    if (selectedCity && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedCity]);

  const triggerResult = (result: ScanResult) => {
    setScanResult(result);
    if (result.status === "success") playScanSuccess();
    else if (result.status === "warning") playScanWarning();
    else playScanError();
  };

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const code = scanInput.trim();
    if (!code || !selectedCity) return;

    setScanInput("");

    const expectedPkg = packages?.find((p) => p.trackingNumber === code);
    if (!expectedPkg) {
      triggerResult({
        status: "error",
        message: `Pacote não encontrado para a cidade ${selectedCity}`,
        trackingNumber: code,
      });
      return;
    }

    const alreadyScanned = scans?.find((s) => s.trackingNumber === code);
    if (alreadyScanned) {
      triggerResult({
        status: "warning",
        message: "Pacote já foi bipado hoje",
        trackingNumber: code,
      });
      return;
    }

    createScan.mutate(
      { data: { trackingNumber: code, city: selectedCity } },
      {
        onSuccess: () => {
          triggerResult({
            status: "success",
            message: "Scan confirmado",
            trackingNumber: code,
          });
          queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        },
        onError: () => {
          triggerResult({
            status: "error",
            message: "Erro ao registrar scan",
            trackingNumber: code,
          });
        },
      },
    );
  };

  const statusConfig = {
    success: {
      bg: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300",
      icon: <CheckCircle2 className="h-7 w-7 text-green-500 flex-shrink-0" />,
      label: "CONFIRMADO",
      labelColor: "text-green-600",
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300",
      icon: <XCircle className="h-7 w-7 text-red-500 flex-shrink-0" />,
      label: "ERRO",
      labelColor: "text-red-600",
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-900 dark:text-yellow-300",
      icon: <AlertCircle className="h-7 w-7 text-yellow-500 flex-shrink-0" />,
      label: "ATENÇÃO",
      labelColor: "text-yellow-600",
    },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pré-Sorter (Bipagem)</h1>
        <p className="text-muted-foreground mt-2">
          Biper pacotes para gerar o romaneio da cidade.
        </p>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              1. Selecione a Cidade do Romaneio
            </label>
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
          </div>

          <div
            className={`transition-opacity duration-300 ${
              selectedCity ? "opacity-100" : "opacity-50 pointer-events-none"
            }`}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">2. Bipar Rastreador</label>
              <Input
                ref={inputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScan}
                placeholder={
                  selectedCity
                    ? "Escaneie o código de barras ou digite e aperte Enter..."
                    : "Selecione uma cidade primeiro"
                }
                className="text-2xl py-8 font-mono tracking-wider"
                disabled={!selectedCity || createScan.isPending}
              />
            </div>
          </div>

          {/* Feedback visual + sonoro */}
          {scanResult && (() => {
            const cfg = statusConfig[scanResult.status];
            return (
              <div
                className={`p-4 rounded-lg border-2 flex items-center gap-4 transition-all ${cfg.bg}`}
              >
                {cfg.icon}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold tracking-widest ${cfg.labelColor}`}>
                    {cfg.label}
                  </p>
                  <p className="font-mono font-bold text-lg leading-tight truncate">
                    {scanResult.trackingNumber}
                  </p>
                  <p className="text-sm mt-0.5 opacity-80">{scanResult.message}</p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {selectedCity && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex justify-between">
                <span>Confirmados (Hoje)</span>
                <span className="text-primary font-bold">{scans?.length || 0}</span>
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {scans?.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-center p-2 rounded border bg-card text-sm"
                    >
                      <span className="font-mono">{s.trackingNumber}</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                  {scans?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum pacote bipado hoje.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex justify-between">
                <span>Faltantes (Esperados)</span>
                <span className="text-muted-foreground font-bold">
                  {(packages?.length || 0) - (scans?.length || 0)}
                </span>
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {packages
                    ?.filter(
                      (p) => !scans?.find((s) => s.trackingNumber === p.trackingNumber),
                    )
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center p-2 rounded border border-dashed bg-muted/30 text-sm"
                      >
                        <span className="font-mono text-muted-foreground">
                          {p.trackingNumber}
                        </span>
                      </div>
                    ))}
                  {packages?.filter(
                    (p) => !scans?.find((s) => s.trackingNumber === p.trackingNumber),
                  ).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Todos os pacotes foram bipados!
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
