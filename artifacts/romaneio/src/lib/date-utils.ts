export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return "";
  try {
    const d = new Date(dateTimeStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch (e) {
    return dateTimeStr;
  }
}

export function getTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - 24);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function getWeekStartDateString(): string {
  const today = getTodayDateString();
  const d = new Date(`${today}T12:00:00-03:00`);
  const dow = d.getDay(); // 0=Sun
  const daysBack = dow === 0 ? 6 : dow - 1; // Monday = start
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
