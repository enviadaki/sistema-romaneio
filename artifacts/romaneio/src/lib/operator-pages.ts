export interface PageDef {
  key: string;
  label: string;
  href: string;
  group: string;
}

export const OPERATOR_PAGES: PageDef[] = [
  { key: "dashboard",          label: "Dashboard",           href: "/",                   group: "Geral" },
  { key: "cadastro",           label: "Cadastro",            href: "/cadastro",           group: "Operação" },
  { key: "pre-sorter",         label: "Pré-Sorter",          href: "/pre-sorter",         group: "Operação" },
  { key: "consulta",           label: "Consulta",            href: "/consulta",           group: "Operação" },
  { key: "entrega",            label: "Checagem de Entrega", href: "/entrega",            group: "Operação" },
  { key: "historico",          label: "Histórico",           href: "/historico",          group: "Operação" },
  { key: "romaneio",           label: "Romaneio",            href: "/romaneio",           group: "Relatórios" },
  { key: "romaneio-motorista", label: "Romaneio Motorista",  href: "/romaneio-motorista", group: "Relatórios" },
  { key: "financeiro",         label: "Financeiro",          href: "/financeiro",         group: "Relatórios" },
];

/** Returns true if the operator is allowed to see this href.
 *  Empty allowedPages means ALL pages are allowed. */
export function isPageAllowed(allowedPages: string[], href: string): boolean {
  if (!allowedPages.length) return true;
  const page = OPERATOR_PAGES.find((p) => p.href === href);
  if (!page) return true; // admin-only pages (e.g. /operadores) are always allowed
  return allowedPages.includes(page.key);
}

/** Groups OPERATOR_PAGES by group label */
export function groupedPages(): { group: string; pages: PageDef[] }[] {
  const map = new Map<string, PageDef[]>();
  for (const p of OPERATOR_PAGES) {
    if (!map.has(p.group)) map.set(p.group, []);
    map.get(p.group)!.push(p);
  }
  return Array.from(map.entries()).map(([group, pages]) => ({ group, pages }));
}
