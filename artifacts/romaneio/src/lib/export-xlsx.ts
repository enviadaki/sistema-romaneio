import * as XLSX from "xlsx";

/**
 * Exporta uma tabela simples (cabeçalho + linhas) para um arquivo .xlsx e
 * dispara o download no navegador. Usa a mesma biblioteca (SheetJS) já usada
 * em Cadastro para importar/exportar planilhas.
 */
export function exportRowsToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  colWidths?: number[]
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  if (colWidths) {
    worksheet["!cols"] = colWidths.map((wch) => ({ wch }));
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename);
}
