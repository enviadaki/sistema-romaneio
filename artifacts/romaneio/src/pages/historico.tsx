import { useState } from "react";
import { 
  useListScans, 
  getListScansQueryKey,
  useListCities,
  getListCitiesQueryKey,
  useDeleteScan
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateTime, formatDate, getTodayDateString } from "@/lib/date-utils";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

export default function Historico() {
  const queryClient = useQueryClient();
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>(getTodayDateString());

  const params: any = {};
  if (cityFilter !== "ALL") params.city = cityFilter;
  if (dateFilter) params.date = dateFilter;

  const { data: scans, isLoading } = useListScans(params, { 
    query: { queryKey: getListScansQueryKey(params) } 
  });
  
  const { data: cities } = useListCities({ query: { queryKey: getListCitiesQueryKey() } });

  const deleteScan = useDeleteScan();

  const handleDelete = (id: number) => {
    deleteScan.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Scans</h1>
        <p className="text-muted-foreground mt-2">Visualize e gerencie todos os registros de bipagem.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-[250px]">
          <label className="text-xs text-muted-foreground mb-1 block">Cidade</label>
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
        <div className="w-full sm:w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Data</label>
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
          />
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={() => { setCityFilter("ALL"); setDateFilter(""); }}>Limpar Filtros</Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Rastreador</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando histórico...</TableCell></TableRow>
            ) : scans?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum scan encontrado para os filtros selecionados.</TableCell></TableRow>
            ) : scans?.map(scan => (
              <TableRow key={scan.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(scan.scannedAt)}</TableCell>
                <TableCell className="font-mono font-medium">{scan.trackingNumber}</TableCell>
                <TableCell>{scan.city}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(scan.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
