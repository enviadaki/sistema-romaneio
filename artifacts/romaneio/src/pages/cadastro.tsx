import { useState } from "react";
import { 
  useListPackages, 
  getListPackagesQueryKey,
  useCreatePackage,
  useBulkCreatePackages,
  useDeletePackage,
  useListCities,
  getListCitiesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

export default function Cadastro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // Single mode state
  const [trackingNumber, setTrackingNumber] = useState("");
  const [city, setCity] = useState("");
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState("");

  // Bulk mode state
  const [bulkData, setBulkData] = useState("");

  const { data: packages, isLoading } = useListPackages(
    cityFilter !== "ALL" ? { city: cityFilter } : {},
    { query: { queryKey: getListPackagesQueryKey(cityFilter !== "ALL" ? { city: cityFilter } : {}) } }
  );
  const { data: cities } = useListCities({ query: { queryKey: getListCitiesQueryKey() } });

  const createPkg = useCreatePackage();
  const bulkCreate = useBulkCreatePackages();
  const deletePkg = useDeletePackage();

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListCitiesQueryKey() });
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || !city || !promisedDeliveryDate) return;

    createPkg.mutate(
      { data: { trackingNumber, city, promisedDeliveryDate } },
      {
        onSuccess: () => {
          toast({ title: "Pacote registrado com sucesso!" });
          setTrackingNumber("");
          // keep city and date to speed up entry
          invalidateLists();
        },
        onError: () => {
          toast({ title: "Erro ao registrar pacote.", variant: "destructive" });
        }
      }
    );
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkData) return;

    try {
      const lines = bulkData.split("\n").filter(l => l.trim().length > 0);
      const packagesData = lines.map(line => {
        const parts = line.split("\t"); // assuming tab separated for spreadsheet paste
        if (parts.length >= 3) {
          return { trackingNumber: parts[0].trim(), city: parts[1].trim(), promisedDeliveryDate: parts[2].trim() };
        }
        const csvParts = line.split(",");
        if (csvParts.length >= 3) {
          return { trackingNumber: csvParts[0].trim(), city: csvParts[1].trim(), promisedDeliveryDate: csvParts[2].trim() };
        }
        throw new Error("Formato inválido. Use Rastreador, Cidade, Data (YYYY-MM-DD)");
      });

      bulkCreate.mutate(
        { data: { packages: packagesData } },
        {
          onSuccess: (res) => {
            toast({ 
              title: "Importação concluída", 
              description: `${res.imported} importados, ${res.skipped} ignorados.` 
            });
            setBulkData("");
            invalidateLists();
          },
          onError: () => {
            toast({ title: "Erro na importação em lote.", variant: "destructive" });
          }
        }
      );
    } catch (err: any) {
      toast({ title: "Erro no formato dos dados", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = (id: number) => {
    deletePkg.mutate(
      { id },
      {
        onSuccess: () => invalidateLists()
      }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastro de Pacotes</h1>
        <p className="text-muted-foreground mt-2">Registre novos pacotes no sistema para posterior bipagem.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div className="flex gap-4 border-b pb-4">
              <Button 
                variant={activeTab === "single" ? "default" : "outline"} 
                onClick={() => setActiveTab("single")}
              >
                Individual
              </Button>
              <Button 
                variant={activeTab === "bulk" ? "default" : "outline"} 
                onClick={() => setActiveTab("bulk")}
              >
                Lote (Colar do Excel)
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === "single" ? (
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Rastreador (Tracking Number)</Label>
                  <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Ex: BR123456789" required />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: São Paulo" required />
                </div>
                <div className="space-y-2">
                  <Label>Data de Entrega Prometida (YYYY-MM-DD)</Label>
                  <Input type="date" value={promisedDeliveryDate} onChange={e => setPromisedDeliveryDate(e.target.value)} required />
                </div>
                <Button type="submit" disabled={createPkg.isPending} className="w-full">
                  {createPkg.isPending ? "Salvando..." : "Cadastrar Pacote"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cole os dados (Rastreador, Cidade, Data)</Label>
                  <CardDescription>Cole diretamente do Excel/Planilhas (separado por tabulação ou vírgula).</CardDescription>
                  <Textarea 
                    rows={10} 
                    value={bulkData} 
                    onChange={e => setBulkData(e.target.value)} 
                    placeholder="BR123456	São Paulo	2023-10-15&#10;BR987654	Rio de Janeiro	2023-10-16"
                    className="font-mono text-sm"
                  />
                </div>
                <Button type="submit" disabled={bulkCreate.isPending} className="w-full">
                  {bulkCreate.isPending ? "Importando..." : "Importar Pacotes"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pacotes Cadastrados</h2>
            <div className="w-[200px]">
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
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rastreador</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Data Prometida</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4">Carregando...</TableCell></TableRow>
                ) : packages?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4">Nenhum pacote encontrado.</TableCell></TableRow>
                ) : packages?.map(pkg => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-mono text-sm">{pkg.trackingNumber}</TableCell>
                    <TableCell>{pkg.city}</TableCell>
                    <TableCell>{formatDate(pkg.promisedDeliveryDate)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
