import { useState } from "react";
import { 
  useGetRomaneio, 
  getGetRomaneioQueryKey,
  useListCities,
  getListCitiesQueryKey
} from "@workspace/api-client-react";
import { formatDate, getTodayDateString } from "@/lib/date-utils";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Romaneio() {
  const [city, setCity] = useState<string>("");
  const [date, setDate] = useState<string>(getTodayDateString());

  const { data: cities } = useListCities({ query: { queryKey: getListCitiesQueryKey() } });

  const { data: romaneio, isLoading } = useGetRomaneio(
    { city, date },
    { query: { queryKey: getGetRomaneioQueryKey({ city, date }), enabled: !!(city && date) } }
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight">Gerar Romaneio</h1>
        <p className="text-muted-foreground mt-2">Gere e imprima o manifesto de entrega.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 no-print border-b pb-6">
        <div className="w-full sm:w-[300px]">
          <label className="text-xs font-semibold mb-1 block">Cidade</label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a cidade..." />
            </SelectTrigger>
            <SelectContent>
              {cities?.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-[200px]">
          <label className="text-xs font-semibold mb-1 block">Data da Bipagem</label>
          <Input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handlePrint} disabled={!romaneio || romaneio.packages.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir Romaneio
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground no-print">Gerando romaneio...</div>}

      {!isLoading && romaneio && (
        <div className="bg-white text-black p-8 border rounded-lg shadow-sm print:shadow-none print:border-0 print:p-0">
          <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wider">ROMANEIO DE ENTREGA</h2>
              <p className="text-lg mt-1 font-semibold">{romaneio.city}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Data do Scan: {formatDate(romaneio.date)}</p>
              <p className="text-xl font-bold mt-2 border border-black inline-block px-3 py-1">
                Total: {romaneio.totalCount} VOLUMES
              </p>
            </div>
          </div>

          {romaneio.packages.length === 0 ? (
            <div className="text-center py-12 italic text-gray-500">
              Nenhum pacote bipado para esta cidade/data.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-200">
                  <th className="border border-black px-4 py-2 text-left">ITEM</th>
                  <th className="border border-black px-4 py-2 text-left">RASTREADOR (TRACKING NUMBER)</th>
                  <th className="border border-black px-4 py-2 text-left">ENTREGA PROMETIDA</th>
                  <th className="border border-black px-4 py-2 text-center w-32">ASSINATURA</th>
                </tr>
              </thead>
              <tbody>
                {romaneio.packages.map((pkg, index) => (
                  <tr key={index}>
                    <td className="border border-black px-4 py-2 text-center w-12">{index + 1}</td>
                    <td className="border border-black px-4 py-2 font-mono font-bold tracking-wider text-base">{pkg.trackingNumber}</td>
                    <td className="border border-black px-4 py-2">{formatDate(pkg.promisedDeliveryDate)}</td>
                    <td className="border border-black px-4 py-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-16 pt-8 border-t border-black flex justify-between text-sm print:mt-auto print:absolute print:bottom-0 print:w-full">
            <div>
              <p>Emitido em: {new Date().toLocaleString('pt-BR')}</p>
              <p>Sistema de Romaneios</p>
            </div>
            <div className="text-center">
              <div className="w-64 border-b border-black mb-1 mx-auto"></div>
              <p>Assinatura do Motorista</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
