import { useMemo, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import type { DeliveryManifest } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface FlatItemRow {
  manifestId: number;
  cidade: string;
  empresa: string;
  motorista: string;
  sacas: number;
  avulsos: number;
}

interface RateioRow {
  cidade: string;
  empresa: string;
  motorista: string;
  sacas: number;
  avulsos: number;
  volumes: number;
  romaneios: number;
}

// Rateio de fretes por operação: cruza cidade × operação × motorista a partir
// dos itens de romaneio já cadastrados (nenhum dado novo é necessário — os
// itens já carregam cidade e operação/empresa).
export default function FinanceiroRateio() {
  const [motoristaFilter, setMotoristaFilter] = useState("");
  const [cidadeFilter, setCidadeFilter] = useState("ALL");
  const [empresaFilter, setEmpresaFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params: Record<string, string> = {};
  if (motoristaFilter) params.motorista = motoristaFilter;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data: manifests = [], isLoading } = useQuery<DeliveryManifest[]>({
    queryKey: ["delivery-manifests-rateio", params],
    queryFn: () => {
      const qs = new URLSearchParams(params).toString();
      return customFetch<DeliveryManifest[]>(`/api/delivery-manifests${qs ? `?${qs}` : ""}`);
    },
  });

  const allRows = useMemo<FlatItemRow[]>(() => {
    const rows: FlatItemRow[] = [];
    for (const m of manifests) {
      for (const it of m.items) {
        rows.push({
          manifestId: m.id,
          cidade: it.cidade,
          empresa: it.empresa || "—",
          motorista: m.motorista,
          sacas: it.sacas,
          avulsos: it.avulsos,
        });
      }
    }
    return rows;
  }, [manifests]);

  const cidades = useMemo(() => [...new Set(allRows.map((r) => r.cidade))].sort(), [allRows]);
  const empresas = useMemo(() => [...new Set(allRows.map((r) => r.empresa))].sort(), [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (cidadeFilter !== "ALL" && r.cidade !== cidadeFilter) return false;
      if (empresaFilter !== "ALL" && r.empresa !== empresaFilter) return false;
      return true;
    });
  }, [allRows, cidadeFilter, empresaFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, RateioRow & { manifestIds: Set<number> }>();
    for (const r of filteredRows) {
      const key = `${r.cidade}__${r.empresa}__${r.motorista}`;
      const volume = r.sacas + r.avulsos;
      const existing = map.get(key);
      if (existing) {
        existing.sacas += r.sacas;
        existing.avulsos += r.avulsos;
        existing.volumes += volume;
        existing.manifestIds.add(r.manifestId);
      } else {
        map.set(key, {
          cidade: r.cidade,
          empresa: r.empresa,
          motorista: r.motorista,
          sacas: r.sacas,
          avulsos: r.avulsos,
          volumes: volume,
          romaneios: 0,
          manifestIds: new Set([r.manifestId]),
        });
      }
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, romaneios: r.manifestIds.size }))
      .sort(
        (a, b) =>
          a.cidade.localeCompare(b.cidade) ||
          a.empresa.localeCompare(b.empresa) ||
          a.motorista.localeCompare(b.motorista)
      );
  }, [filteredRows]);

  const totalVolumes = grouped.reduce((s, r) => s + r.volumes, 0);

  const hasFilters = motoristaFilter || cidadeFilter !== "ALL" || empresaFilter !== "ALL" || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Rateio de Fretes por Operação</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Quantidade de pacotes por cidade, operação e motorista, a partir dos romaneios cadastrados.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Motorista</label>
          <Input
            className="w-[200px]"
            placeholder="Filtrar por motorista"
            value={motoristaFilter}
            onChange={(e) => setMotoristaFilter(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cidade</label>
          <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {cidades.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Operação</label>
          <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">De</label>
          <Input type="date" className="w-[145px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Até</label>
          <Input type="date" className="w-[145px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {hasFilters && (
          <Button
            variant="outline"
            onClick={() => {
              setMotoristaFilter("");
              setCidadeFilter("ALL");
              setEmpresaFilter("ALL");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Cidade × Operação × Motorista</span>
            <span className="text-sm font-normal text-muted-foreground">{totalVolumes} volumes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-center">Romaneios</TableHead>
                  <TableHead className="text-center">Sacas</TableHead>
                  <TableHead className="text-center">Avulsos</TableHead>
                  <TableHead className="text-center font-bold">Volumes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : grouped.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhum dado encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  grouped.map((r) => (
                    <TableRow key={`${r.cidade}__${r.empresa}__${r.motorista}`}>
                      <TableCell className="font-medium">{r.cidade}</TableCell>
                      <TableCell>
                        <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {r.empresa}
                        </span>
                      </TableCell>
                      <TableCell>{r.motorista}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{r.romaneios}</TableCell>
                      <TableCell className="text-center">{r.sacas}</TableCell>
                      <TableCell className="text-center">{r.avulsos}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{r.volumes}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
