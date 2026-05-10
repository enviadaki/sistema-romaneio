import { useState } from "react";
import {
  useGetRomaneio,
  getGetRomaneioQueryKey,
  useListCities,
  getListCitiesQueryKey
} from "@workspace/api-client-react";
import { formatDate, getTodayDateString } from "@/lib/date-utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Printer, FileDown, Settings2, X } from "lucide-react";
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

export default function Romaneio() {
  const [city, setCity] = useState<string>("");
  const [date, setDate] = useState<string>(getTodayDateString());

  // Company settings for PDF header
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

  const { data: cities } = useListCities({ query: { queryKey: getListCitiesQueryKey() } });

  const { data: romaneio, isLoading } = useGetRomaneio(
    { city, date },
    { query: { queryKey: getGetRomaneioQueryKey({ city, date }), enabled: !!(city && date) } }
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!romaneio) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // ── Header background bar ──
    doc.setFillColor(15, 40, 80);
    doc.rect(0, 0, pageWidth, 38, "F");

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(empresa || "SISTEMA DE ROMANEIOS", margin, 14);

    // CNPJ / address
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (cnpj) doc.text(`CNPJ: ${cnpj}`, margin, 21);
    if (endereco) doc.text(endereco, margin, endereco && cnpj ? 27 : 21);

    // Document title (right side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    const titleText = "ROMANEIO DE ENTREGA";
    const titleW = doc.getTextWidth(titleText);
    doc.text(titleText, pageWidth - margin - titleW, 14);

    // Emission date (right side)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const emitidoText = `Emitido: ${new Date().toLocaleString("pt-BR")}`;
    const emitW = doc.getTextWidth(emitidoText);
    doc.text(emitidoText, pageWidth - margin - emitW, 21);

    // ── Info block below header ──
    doc.setFillColor(240, 244, 250);
    doc.rect(0, 38, pageWidth, 18, "F");

    doc.setTextColor(15, 40, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CIDADE DESTINO:", margin, 47);
    doc.setFont("helvetica", "normal");
    doc.text(romaneio.city.toUpperCase(), margin + doc.getTextWidth("CIDADE DESTINO:") + 2, 47);

    doc.setFont("helvetica", "bold");
    doc.text("DATA DE BIPAGEM:", margin + 70, 47);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(romaneio.date), margin + 70 + doc.getTextWidth("DATA DE BIPAGEM:") + 2, 47);

    // Total volumes — highlighted box
    doc.setFillColor(15, 40, 80);
    const boxX = pageWidth - margin - 60;
    doc.roundedRect(boxX, 39, 60, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TOTAL DE VOLUMES", boxX + 30, 46, { align: "center" });
    doc.setFontSize(16);
    doc.text(String(romaneio.totalCount), boxX + 30, 53, { align: "center" });

    // ── Table ──
    const tableStartY = 62;

    const tableRows = romaneio.packages.map((pkg, i) => [
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
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [180, 195, 215],
        lineWidth: 0.3,
        textColor: [20, 30, 50],
        valign: "middle",
      },
      headStyles: {
        fillColor: [15, 40, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: [245, 248, 252],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 75, fontStyle: "bold", font: "courier", fontSize: 9 },
        2: { cellWidth: 38, halign: "center" },
        3: { cellWidth: contentWidth - 12 - 75 - 38 },
      },
      didDrawPage: (data) => {
        // Page number footer
        const pageCount = (doc.internal as any).getNumberOfPages();
        const currentPage = data.pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(130, 140, 160);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Página ${currentPage}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
      },
    });

    // ── Footer on last page ──
    const finalY = (doc as any).lastAutoTable.finalY + 16;

    if (finalY < pageHeight - 45) {
      // Separator line
      doc.setDrawColor(180, 195, 215);
      doc.setLineWidth(0.4);
      doc.line(margin, finalY, pageWidth - margin, finalY);

      // Signature area
      const sigY = finalY + 20;
      const sigW = 70;

      doc.setDrawColor(60, 80, 120);
      doc.setLineWidth(0.6);
      doc.line(margin, sigY, margin + sigW, sigY);
      doc.setTextColor(80, 95, 120);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Assinatura do Motorista / Entregador", margin + sigW / 2, sigY + 5, { align: "center" });

      doc.line(pageWidth - margin - sigW, sigY, pageWidth - margin, sigY);
      doc.text("Assinatura do Responsável", pageWidth - margin - sigW / 2, sigY + 5, { align: "center" });

      // Footer note
      doc.setFontSize(7);
      doc.setTextColor(150, 160, 175);
      doc.text(
        `Documento gerado automaticamente pelo Sistema de Romaneios — ${new Date().toLocaleString("pt-BR")}`,
        pageWidth / 2,
        pageHeight - 14,
        { align: "center" }
      );
    }

    // Save
    const fileName = `romaneio_${romaneio.city.replace(/\s+/g, "_")}_${romaneio.date}.pdf`;
    doc.save(fileName);
  };

  const canExport = !!(romaneio && romaneio.packages.length > 0);

  return (
    <div className="space-y-8">
      <div className="no-print flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerar Romaneio</h1>
          <p className="text-muted-foreground mt-2">Gere, imprima ou exporte o manifesto de entrega em PDF.</p>
        </div>

        {/* Company settings dialog */}
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
                <Input
                  value={empresa}
                  onChange={e => setEmpresa(e.target.value)}
                  placeholder="Ex: Transportadora Rápida Ltda"
                />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço</Label>
                <Input
                  value={endereco}
                  onChange={e => setEndereco(e.target.value)}
                  placeholder="Rua Exemplo, 123 — São Paulo, SP"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setSettingsOpen(false)} className="flex-1">Cancelar</Button>
                <Button onClick={saveSettings} className="flex-1">Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 no-print border-b pb-6">
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
        <div className="w-full sm:w-[200px]">
          <Label className="text-xs font-semibold mb-1 block">Data da Bipagem</Label>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
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
      </div>

      {!city && (
        <div className="text-center py-16 text-muted-foreground no-print">
          Selecione uma cidade para gerar o romaneio.
        </div>
      )}

      {isLoading && city && (
        <div className="text-center py-12 text-muted-foreground no-print">Gerando romaneio...</div>
      )}

      {/* Print/preview area */}
      {!isLoading && romaneio && (
        <div className="bg-white text-black p-8 border rounded-lg shadow-sm print:shadow-none print:border-0 print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wider">ROMANEIO DE ENTREGA</h2>
              {empresa && <p className="text-sm mt-1 text-gray-600">{empresa}{cnpj ? ` — CNPJ: ${cnpj}` : ""}</p>}
              {endereco && <p className="text-xs text-gray-500 mt-0.5">{endereco}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Cidade: {romaneio.city}</p>
              <p className="text-sm">Data do Scan: {formatDate(romaneio.date)}</p>
              <p className="text-xl font-bold mt-2 border-2 border-black inline-block px-3 py-1">
                {romaneio.totalCount} VOLUMES
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
                <tr className="bg-gray-100">
                  <th className="border border-black px-3 py-2 text-center w-10">#</th>
                  <th className="border border-black px-3 py-2 text-left">RASTREADOR (TRACKING NUMBER)</th>
                  <th className="border border-black px-3 py-2 text-left w-36">ENTREGA PROMETIDA</th>
                  <th className="border border-black px-3 py-2 text-center w-36">ASSINATURA</th>
                </tr>
              </thead>
              <tbody>
                {romaneio.packages.map((pkg, index) => (
                  <tr key={index} className={index % 2 === 1 ? "bg-gray-50" : ""}>
                    <td className="border border-black px-3 py-2 text-center font-bold">{index + 1}</td>
                    <td className="border border-black px-3 py-2 font-mono font-bold tracking-wider">{pkg.trackingNumber}</td>
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
    </div>
  );
}
