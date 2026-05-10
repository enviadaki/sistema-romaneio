import { useState, useRef, useEffect } from "react";
import { 
  useListCities, 
  getListCitiesQueryKey,
  useCreateScan,
  useListScans,
  getListScansQueryKey,
  useListPackages,
  getListPackagesQueryKey,
  getGetStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getTodayDateString } from "@/lib/date-utils";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PreSorter() {
  const queryClient = useQueryClient();
  const today = getTodayDateString();

  const [selectedCity, setSelectedCity] = useState<string>("");
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error' | 'warning', message: string, trackingNumber?: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: cities } = useListCities({ query: { queryKey: getListCitiesQueryKey() } });
  
  // Scans for today in the selected city
  const { data: scans } = useListScans(
    { city: selectedCity, date: today },
    { query: { queryKey: getListScansQueryKey({ city: selectedCity, date: today }), enabled: !!selectedCity } }
  );

  // Expected packages for the city
  const { data: packages } = useListPackages(
    { city: selectedCity },
    { query: { queryKey: getListPackagesQueryKey({ city: selectedCity }), enabled: !!selectedCity } }
  );

  const createScan = useCreateScan();

  // Auto-focus logic
  useEffect(() => {
    if (selectedCity && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedCity]);

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = scanInput.trim();
      if (!code || !selectedCity) return;
      
      setScanInput("");

      // Validate against packages
      const expectedPkg = packages?.find(p => p.trackingNumber === code);
      if (!expectedPkg) {
        setScanResult({ status: 'error', message: `Pacote não encontrado para a cidade ${selectedCity}`, trackingNumber: code });
        return;
      }

      // Check if already scanned today
      const alreadyScanned = scans?.find(s => s.trackingNumber === code);
      if (alreadyScanned) {
        setScanResult({ status: 'warning', message: `Pacote já foi bipado hoje`, trackingNumber: code });
        return;
      }

      createScan.mutate(
        { data: { trackingNumber: code, city: selectedCity } },
        {
          onSuccess: () => {
            setScanResult({ status: 'success', message: `Scan confirmado`, trackingNumber: code });
            queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() }); // Assuming dashboard stats need update
            setTimeout(() => {
              if (inputRef.current) inputRef.current.focus();
            }, 100);
          },
          onError: () => {
            setScanResult({ status: 'error', message: `Erro ao registrar scan`, trackingNumber: code });
          }
        }
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pré-Sorter (Bipagem)</h1>
        <p className="text-muted-foreground mt-2">Biper pacotes para gerar o romaneio da cidade.</p>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">1. Selecione a Cidade do Romaneio</label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="text-lg py-6">
                <SelectValue placeholder="Selecione a cidade..." />
              </SelectTrigger>
              <SelectContent>
                {cities?.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={`transition-opacity duration-300 ${selectedCity ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="space-y-2">
              <label className="text-sm font-medium">2. Bipar Rastreador</label>
              <Input 
                ref={inputRef}
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={handleScan}
                placeholder={selectedCity ? "Escaneie o código de barras ou digite e aperte Enter..." : "Selecione uma cidade primeiro"}
                className="text-2xl py-8 font-mono tracking-wider"
                disabled={!selectedCity || createScan.isPending}
              />
            </div>
          </div>

          {scanResult && (
            <div className={`p-4 rounded-md border flex items-center gap-3 ${
              scanResult.status === 'success' ? 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300' :
              scanResult.status === 'error' ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300' :
              'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-900 dark:text-yellow-300'
            }`}>
              {scanResult.status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
              {scanResult.status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
              {scanResult.status === 'warning' && <AlertCircle className="h-6 w-6 text-yellow-500" />}
              <div>
                <p className="font-bold">{scanResult.trackingNumber}</p>
                <p className="text-sm">{scanResult.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCity && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex justify-between">
                <span>Confirmados (Hoje)</span>
                <span className="text-primary">{scans?.length || 0}</span>
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {scans?.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-2 rounded border bg-card text-sm">
                      <span className="font-mono">{s.trackingNumber}</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                  {scans?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Nenhum pacote bipado hoje.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 flex justify-between">
                <span>Faltantes (Esperados)</span>
                <span className="text-muted-foreground">
                  {(packages?.length || 0) - (scans?.length || 0)}
                </span>
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {packages?.filter(p => !scans?.find(s => s.trackingNumber === p.trackingNumber)).map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2 rounded border border-dashed bg-muted/30 text-sm">
                      <span className="font-mono text-muted-foreground">{p.trackingNumber}</span>
                    </div>
                  ))}
                  {packages?.filter(p => !scans?.find(s => s.trackingNumber === p.trackingNumber)).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Todos os pacotes foram bipados!</p>
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
