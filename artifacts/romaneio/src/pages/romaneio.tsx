import { useState, useCallback, useRef } from "react";
import {
  useListCities,
  getListCitiesQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { useOperation } from "@/contexts/operation-context";
import { formatDate, getTodayDateString } from "@/lib/date-utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ROUTES } from "@/lib/routes-data";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useMotoristaAuth } from "@/contexts/motorista-auth-context";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Printer, FileDown, Settings2, MapPin, Route, Layers, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type FilterMode = "cidade" | "rota" | "massa";

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
  city?: string;
  cities?: string;
  label?: string;
  date: string;
  operation: string;
}): Promise<RomaneioData> {
  const url = new URL("/api/romaneio", window.location.origin);
  if (params.city) url.searchParams.set("city", params.city);
  if (params.cities) url.searchParams.set("cities", params.cities);
  if (params.label) url.searchParams.set("label", params.label);
  url.searchParams.set("date", params.date);
  url.searchParams.set("operation", params.operation);

  return customFetch<RomaneioData>(url.toString());
}

function groupByCity(packages: RomaneioItem[]) {
  const map: Record<string, RomaneioItem[]> = {};
  for (const pkg of packages) {
    if (!map[pkg.city]) map[pkg.city] = [];
    map[pkg.city].push(pkg);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([city, pkgs]) => ({ city, packages: pkgs }));
}

function addRomaneioToPDF(
  doc: jsPDF,
  data: RomaneioData,
  opts: {
    empresa: string;
    cnpj: string;
    endereco: string;
    isFirst: boolean;
    isRouteMode: boolean;
  },
) {
  if (!opts.isFirst) doc.addPage();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // ── Header background ──
  doc.setFillColor(235, 235, 235);
  doc.rect(0, 0, pageWidth, 38, "F");
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.6);
  doc.line(0, 38, pageWidth, 38);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.empresa || "SISTEMA DE ROMANEIOS", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (opts.cnpj) doc.text(`CNPJ: ${opts.cnpj}`, margin, 21);
  if (opts.endereco) doc.text(opts.endereco, margin, opts.endereco && opts.cnpj ? 27 : 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  const titleText = "ROMANEIO DE ENTREGA";
  const titleW = doc.getTextWidth(titleText);
  doc.text(titleText, pageWidth - margin - titleW, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const emitidoText = `Emitido: ${new Date().toLocaleString("pt-BR")}`;
  const emitW = doc.getTextWidth(emitidoText);
  doc.text(emitidoText, pageWidth - margin - emitW, 21);

  // ── Route banner ──
  const bannerTop = 38;
  const bannerH = 34;
  doc.setFillColor(210, 210, 210);
  doc.rect(0, bannerTop, pageWidth, bannerH, "F");

  // Faixa lateral de destaque — barra preta sólida
  doc.setFillColor(30, 30, 30);
  doc.rect(0, bannerTop, 5, bannerH, "F");

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.4);
  doc.line(0, bannerTop + bannerH, pageWidth, bannerTop + bannerH);

  const destinoLabel = opts.isRouteMode ? "ROTA" : "CIDADE DESTINO";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text(destinoLabel, margin + 2, bannerTop + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(10, 10, 10);
  doc.text(data.city.toUpperCase(), margin + 2, bannerTop + 27);

  // Total volumes (direita, dentro do banner)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text("TOTAL DE VOLUMES", pageWidth - margin, bannerTop + 10, { align: "right" });
  doc.setFontSize(24);
  doc.setTextColor(10, 10, 10);
  doc.text(String(data.totalCount), pageWidth - margin, bannerTop + 28, { align: "right" });

  // ── Info bar (data) ──
  const infoTop = bannerTop + bannerH;
  const infoH = 18;
  doc.setFillColor(248, 248, 248);
  doc.rect(0, infoTop, pageWidth, infoH, "F");
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(0, infoTop + infoH, pageWidth, infoTop + infoH);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATA DE BIPAGEM:", margin, infoTop + 12);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(data.date), margin + doc.getTextWidth("DATA DE BIPAGEM:") + 2, infoTop + 12);

  // ── Table ──
  const tableStartY = infoTop + infoH + 4;

  if (opts.isRouteMode) {
    const groups = groupByCity(data.packages);
    let currentY = tableStartY;
    let globalIndex = 1;

    for (const group of groups) {
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [[{ content: `📍 ${group.city.toUpperCase()}  (${group.packages.length} volumes)`, colSpan: 4 }]],
        body: group.packages.map((pkg) => [
          String(globalIndex++),
          pkg.trackingNumber,
          formatDate(pkg.promisedDeliveryDate),
          "",
        ]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3, lineColor: [160, 160, 160], lineWidth: 0.3, textColor: [20, 20, 20], valign: "middle" },
        headStyles: { fillColor: [190, 190, 190], textColor: [10, 10, 10], fontStyle: "bold", fontSize: 9, cellPadding: 4 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 75, fontStyle: "bold", font: "courier", fontSize: 9 },
          2: { cellWidth: 38, halign: "center" },
          3: { cellWidth: contentWidth - 12 - 75 - 38 },
        },
        didDrawPage: (d) => {
          const pageCount = (doc.internal as any).getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "normal");
          doc.text(`Página ${d.pageNumber}`, pageWidth / 2, pageHeight - 8, { align: "center" });
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 4;
    }
  } else {
    const tableRows = data.packages.map((pkg, i) => [
      String(i + 1),
      pkg.trackingNumber,
      formatDate(pkg.promisedDeliveryDate),
      "",
    ]);

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin },
      head: [["#", "RASTREADOR (TRACKING NUMBER)", "ENTREGA PROMETIDA", "ASSINATURA"]],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3, lineColor: [160, 160, 160], lineWidth: 0.3, textColor: [20, 20, 20], valign: "middle" },
      headStyles: { fillColor: [190, 190, 190], textColor: [10, 10, 10], fontStyle: "bold", fontSize: 8, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 75, fontStyle: "bold", font: "courier", fontSize: 9 },
        2: { cellWidth: 38, halign: "center" },
        3: { cellWidth: contentWidth - 12 - 75 - 38 },
      },
      didDrawPage: (d) => {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(`Página ${d.pageNumber}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      },
    });
  }

  // ── Footer ──
  const finalY = (doc as any).lastAutoTable.finalY + 16;
  if (finalY < pageHeight - 45) {
    doc.setDrawColor(140, 140, 140);
    doc.setLineWidth(0.4);
    doc.line(margin, finalY, pageWidth - margin, finalY);

    const sigY = finalY + 20;
    const sigW = 70;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.6);
    doc.line(margin, sigY, margin + sigW, sigY);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Assinatura do Motorista / Entregador", margin + sigW / 2, sigY + 5, { align: "center" });

    doc.line(pageWidth - margin - sigW, sigY, pageWidth - margin, sigY);
    doc.text("Assinatura do Responsável", pageWidth - margin - sigW / 2, sigY + 5, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(150, 160, 175);
    doc.text(
      `Documento gerado automaticamente pelo Sistema de Romaneios — ${new Date().toLocaleString("pt-BR")}`,
      pageWidth / 2,
      pageHeight - 14,
      { align: "center" },
    );
  }
}

export default function Romaneio() {
  const { operation } = useOperation();
  const { user } = useUser();
  const { user: motoristaUser } = useMotoristaAuth();
  const [filterMode, setFilterMode] = useState<FilterMode>("cidade");
  const [city, setCity] = useState<string>("");
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [date, setDate] = useState<string>(getTodayDateString());

  // Mass mode state
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [massLoading, setMassLoading] = useState(false);
  const [massProgress, setMassProgress] = useState<{ current: number; total: number } | null>(null);
  const [massError, setMassError] = useState<string | null>(null);

  const allowedRouteCodes: string[] | undefined =
    motoristaUser?.allowedRoutes?.length
      ? motoristaUser.allowedRoutes
      : (user?.publicMetadata?.allowedRoutes as string[] | undefined);
  const filteredRoutes = allowedRouteCodes?.length
    ? ROUTES.filter((r) => allowedRouteCodes.some((code) => r.name.includes(code)))
    : ROUTES;

  const [empresa, setEmpresa] = useState(() => localStorage.getItem("romaneio_empresa") || "");
  const [cnpj, setCnpj] = useState(() => localStorage.getItem("romaneio_cnpj") || "");
  const [endereco, setEndereco] = useState(() => localStorage.getItem("romaneio_endereco") || "");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const saveSettings = () => {
    localStorage.setItem("romaneio_empresa", empresa);
    localStorage.setItem("romaneio_cnpj", cnpj);
    localStorage.setItem("romaneio_endereco", endereco);
    setSettingsOpen(false);
  };

  const { data: cities } = useListCities({
    query: {
      queryKey: [...getListCitiesQueryKey(), operation],
      queryFn: () => customFetch<string[]>(`/api/cities?operation=${operation}`),
    },
  });

  const isReady =
    !!date && (filterMode === "cidade" ? !!city : filterMode === "rota" ? !!selectedRoute : false);

  const routeObj = filteredRoutes.find((r) => r.name === selectedRoute);

  const { data: romaneio, isLoading } = useQuery({
    queryKey: ["romaneio", filterMode, filterMode === "cidade" ? city : selectedRoute, date, operation],
    enabled: isReady,
    queryFn: () => {
      if (filterMode === "cidade") {
        return fetchRomaneio({ city, date, operation });
      } else {
        return fetchRomaneio({
          cities: routeObj?.cities.join(",") ?? "",
          label: selectedRoute,
          date,
          operation,
        });
      }
    },
  });

  const packagesByCity = useCallback(() => {
    if (!romaneio) return [];
    if (filterMode === "cidade") return [{ city: romaneio.city, packages: romaneio.packages }];
    return groupByCity(romaneio.packages);
  }, [romaneio, filterMode]);

  const isRouteMode = filterMode === "rota";
  const canExport = !!(romaneio && romaneio.packages.length > 0);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    if (!romaneio) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    addRomaneioToPDF(doc, romaneio, { empresa, cnpj, endereco, isFirst: true, isRouteMode });
    const safeName = romaneio.city.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    doc.save(`romaneio_${safeName}_${romaneio.date}.pdf`);
  };

  // ── Mass PDF ──
  const toggleRoute = (name: string) => {
    setSelectedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelectedRoutes(new Set(filteredRoutes.map((r) => r.name)));
  const clearAll = () => setSelectedRoutes(new Set());

  const handleMassPDF = async () => {
    if (selectedRoutes.size === 0 || !date) return;
    setMassLoading(true);
    setMassError(null);

    const routeObjs = filteredRoutes.filter((r) => selectedRoutes.has(r.name));
    setMassProgress({ current: 0, total: routeObjs.length });

    const results: { data: RomaneioData }[] = [];

    for (let i = 0; i < routeObjs.length; i++) {
      const route = routeObjs[i];
      try {
        const data = await fetchRomaneio({
          cities: route.cities.join(","),
          label: route.name,
          date,
          operation,
        });
        if (data.packages.length > 0) {
          results.push({ data });
        }
      } catch {
        // skip routes that fail
      }
      setMassProgress({ current: i + 1, total: routeObjs.length });
    }

    if (results.length === 0) {
      setMassError("Nenhuma rota selecionada possui pacotes bipados para a data escolhida.");
      setMassLoading(false);
      setMassProgress(null);
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    results.forEach(({ data }, idx) => {
      addRomaneioToPDF(doc, data, { empresa, cnpj, endereco, isFirst: idx === 0, isRouteMode: true });
    });

    doc.save(`romaneios_massa_${date}.pdf`);
    setMassLoading(false);
    setMassProgress(null);
  };

  return (
    <div className="space-y-8">
      <div className="no-print flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerar Romaneio</h1>
          <p className="text-muted-foreground mt-2">Gere, imprima ou exporte o manifesto de entrega em PDF.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`mt-1 text-sm font-bold px-3 py-1 rounded-full border ${
            operation === "LOGGI"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-orange-50 text-orange-700 border-orange-200"
          }`}>
            {operation}
          </span>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Dados da Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dados para o PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nome da Empresa / Transportadora</Label>
                <Input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ex: Transportadora Rápida Ltda" />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço</Label>
                <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua Exemplo, 123 — São Paulo, SP" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setSettingsOpen(false)} className="flex-1">Cancelar</Button>
                <Button onClick={saveSettings} className="flex-1">Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 no-print border-b pb-6">
        {/* Mode toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-[240px]">
            <Label className="text-xs font-semibold mb-1 block">Filtrar por</Label>
            <Tabs
              value={filterMode}
              onValueChange={(v) => {
                setFilterMode(v as FilterMode);
                setCity("");
                setSelectedRoute("");
                setMassError(null);
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="cidade" className="flex-1 gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Cidade
                </TabsTrigger>
                <TabsTrigger value="rota" className="flex-1 gap-1.5">
                  <Route className="h-3.5 w-3.5" />
                  Rota
                </TabsTrigger>
                <TabsTrigger value="massa" className="flex-1 gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Em Massa
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filterMode === "cidade" ? (
            <div className="w-full sm:w-[280px]">
              <Label className="text-xs font-semibold mb-1 block">Cidade</Label>
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
          ) : filterMode === "rota" ? (
            <div className="w-full sm:w-[320px]">
              <Label className="text-xs font-semibold mb-1 block">Rota</Label>
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a rota..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredRoutes.map(r => (
                    <SelectItem key={r.name} value={r.name}>
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({r.cities.length} cidades)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="w-full sm:w-[200px]">
            <Label className="text-xs font-semibold mb-1 block">Data da Bipagem</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {filterMode !== "massa" && (
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handlePrint} disabled={!canExport}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handleExportPDF} disabled={!canExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          )}
        </div>

        {/* Route city badges (rota mode) */}
        {filterMode === "rota" && selectedRoute && routeObj && (
          <div className="flex flex-wrap gap-1">
            {routeObj.cities.slice(0, 10).map(c => (
              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
            ))}
            {routeObj.cities.length > 10 && (
              <Badge variant="outline" className="text-xs">+{routeObj.cities.length - 10} mais</Badge>
            )}
          </div>
        )}
      </div>

      {/* ── MASSA MODE UI ── */}
      {filterMode === "massa" && (
        <div className="no-print space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Selecione as rotas para impressão em massa</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedRoutes.size} de {filteredRoutes.length} rotas selecionadas
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Selecionar todas
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={selectedRoutes.size === 0}>
                Limpar
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[340px] rounded-md border">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {filteredRoutes.map((route) => {
                const checked = selectedRoutes.has(route.name);
                return (
                  <label
                    key={route.name}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                      checked
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRoute(route.name)}
                      className="shrink-0"
                    />
                    <span className="leading-tight font-medium truncate">{route.name}</span>
                  </label>
                );
              })}
            </div>
          </ScrollArea>

          {massError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3">
              {massError}
            </div>
          )}

          {massLoading && massProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Buscando dados das rotas...</span>
                <span>{massProgress.current} / {massProgress.total}</span>
              </div>
              <Progress value={(massProgress.current / massProgress.total) * 100} className="h-2" />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleMassPDF}
              disabled={selectedRoutes.size === 0 || !date || massLoading}
              className="gap-2"
            >
              {massLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Gerar PDF em Massa ({selectedRoutes.size} {selectedRoutes.size === 1 ? "rota" : "rotas"})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── SINGLE ROMANEIO PREVIEW ── */}
      {filterMode !== "massa" && (
        <>
          {!isReady && (
            <div className="text-center py-16 text-muted-foreground no-print">
              Selecione uma {filterMode === "cidade" ? "cidade" : "rota"} para gerar o romaneio.
            </div>
          )}

          {isLoading && isReady && (
            <div className="text-center py-12 text-muted-foreground no-print">Gerando romaneio...</div>
          )}

          {!isLoading && romaneio && (
            <div className="bg-white text-black p-8 border rounded-lg shadow-sm print:shadow-none print:border-0 print:p-0">
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-wider">ROMANEIO DE ENTREGA</h2>
                  {empresa && <p className="text-sm mt-1 text-gray-600">{empresa}{cnpj ? ` — CNPJ: ${cnpj}` : ""}</p>}
                  {endereco && <p className="text-xs text-gray-500 mt-0.5">{endereco}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {isRouteMode ? "Rota:" : "Cidade:"} {romaneio.city}
                  </p>
                  <p className="text-sm">Data do Scan: {formatDate(romaneio.date)}</p>
                  <p className="text-xl font-bold mt-2 border-2 border-black inline-block px-3 py-1">
                    {romaneio.totalCount} VOLUMES
                  </p>
                </div>
              </div>

              {romaneio.packages.length === 0 ? (
                <div className="text-center py-12 italic text-gray-500">
                  Nenhum pacote bipado para {isRouteMode ? "esta rota" : "esta cidade"}/data.
                </div>
              ) : isRouteMode ? (
                <div className="space-y-6">
                  {packagesByCity().map((group) => (
                    <div key={group.city}>
                      <div className="flex items-center gap-2 mb-2 bg-gray-100 px-3 py-1.5 rounded">
                        <MapPin className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <span className="font-bold text-sm uppercase tracking-wide">{group.city}</span>
                        <span className="text-xs text-gray-500 ml-auto">{group.packages.length} volume{group.packages.length !== 1 ? "s" : ""}</span>
                      </div>
                      <table className="w-full text-sm border-collapse border border-black">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-black px-2 py-1.5 text-center w-8">#</th>
                            <th className="border border-black px-2 py-1.5 text-left">RASTREADOR</th>
                            <th className="border border-black px-2 py-1.5 text-left w-32">ENTREGA PROMETIDA</th>
                            <th className="border border-black px-2 py-1.5 text-center w-32">ASSINATURA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.packages.map((pkg, index) => (
                            <tr key={index} className={index % 2 === 1 ? "bg-gray-50" : ""}>
                              <td className="border border-black px-2 py-1.5 text-center font-bold">{index + 1}</td>
                              <td className="border border-black px-2 py-1.5 font-mono font-bold tracking-wider">{pkg.trackingNumber}</td>
                              <td className="border border-black px-2 py-1.5">{formatDate(pkg.promisedDeliveryDate)}</td>
                              <td className="border border-black px-2 py-1.5"></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full text-sm border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-3 py-2 text-center w-10">#</th>
                      <th className="border border-black px-3 py-2 text-left">RASTREADOR (TRACKING NUMBER)</th>
                      <th className="border border-black px-3 py-2 text-left w-32">CIDADE</th>
                      <th className="border border-black px-3 py-2 text-left w-36">ENTREGA PROMETIDA</th>
                      <th className="border border-black px-3 py-2 text-center w-36">ASSINATURA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {romaneio.packages.map((pkg, index) => (
                      <tr key={index} className={index % 2 === 1 ? "bg-gray-50" : ""}>
                        <td className="border border-black px-3 py-2 text-center font-bold">{index + 1}</td>
                        <td className="border border-black px-3 py-2 font-mono font-bold tracking-wider">{pkg.trackingNumber}</td>
                        <td className="border border-black px-3 py-2 text-xs">{pkg.city}</td>
                        <td className="border border-black px-3 py-2">{formatDate(pkg.promisedDeliveryDate)}</td>
                        <td className="border border-black px-3 py-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="mt-14 pt-6 border-t border-black flex justify-between text-sm">
                <div className="text-gray-600">
                  <p>Emitido em: {new Date().toLocaleString("pt-BR")}</p>
                  <p>Sistema de Romaneios</p>
                </div>
                <div className="text-center">
                  <div className="w-56 border-b border-black mb-1 mx-auto mt-8"></div>
                  <p className="text-xs">Assinatura do Motorista / Entregador</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
