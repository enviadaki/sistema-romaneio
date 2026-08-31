# Inventário de componentes — Sistema de Romaneios

Fonte explícita: `artifacts/romaneio/src/components/ui/`. Famílias normalizadas a partir dos módulos da biblioteca; `toaster.tsx` integra a família Toast.

| Família | Referência | Dependências | Evidência de uso | Lote | Status |
| --- | --- | --- | ---: | ---: | --- |
| Button | [button](components/button.md) | — | 14 arquivo(s) | 1 | implemented |
| Card | [card](components/card.md) | — | 14 arquivo(s) | 1 | implemented |
| Input | [input](components/input.md) | — | 13 arquivo(s) | 1 | implemented |
| Badge | [badge](components/badge.md) | — | 11 arquivo(s) | 1 | implemented |
| Table | [table](components/table.md) | — | 7 arquivo(s) | 1 | implemented |
| Select | [select](components/select.md) | — | 9 arquivo(s) | 2 | pending |
| Label | [label](components/label.md) | — | 6 arquivo(s) | 2 | pending |
| Checkbox | [checkbox](components/checkbox.md) | — | 4 arquivo(s) | 2 | pending |
| Textarea | [textarea](components/textarea.md) | — | 3 arquivo(s) | 2 | pending |
| Calendar | [calendar](components/calendar.md) | button | 0 arquivo(s) | 2 | pending |
| Field | [field](components/field.md) | label, separator | 0 arquivo(s) | 2 | pending |
| Form | [form](components/form.md) | label | 0 arquivo(s) | 2 | pending |
| Input Group | [input-group](components/input-group.md) | button, input, textarea | 0 arquivo(s) | 2 | pending |
| Input OTP | [input-otp](components/input-otp.md) | — | 0 arquivo(s) | 2 | pending |
| Radio Group | [radio-group](components/radio-group.md) | — | 0 arquivo(s) | 2 | pending |
| Slider | [slider](components/slider.md) | — | 0 arquivo(s) | 2 | pending |
| Switch | [switch](components/switch.md) | — | 0 arquivo(s) | 2 | pending |
| Dialog | [dialog](components/dialog.md) | — | 9 arquivo(s) | 3 | pending |
| Alert Dialog | [alert-dialog](components/alert-dialog.md) | button | 3 arquivo(s) | 3 | pending |
| Command | [command](components/command.md) | dialog | 1 arquivo(s) | 3 | pending |
| Popover | [popover](components/popover.md) | — | 1 arquivo(s) | 3 | pending |
| Tooltip | [tooltip](components/tooltip.md) | — | 1 arquivo(s) | 3 | pending |
| Context Menu | [context-menu](components/context-menu.md) | — | 0 arquivo(s) | 3 | pending |
| Drawer | [drawer](components/drawer.md) | — | 0 arquivo(s) | 3 | pending |
| Dropdown Menu | [dropdown-menu](components/dropdown-menu.md) | — | 0 arquivo(s) | 3 | pending |
| Hover Card | [hover-card](components/hover-card.md) | — | 0 arquivo(s) | 3 | pending |
| Sheet | [sheet](components/sheet.md) | — | 0 arquivo(s) | 3 | pending |
| Scroll Area | [scroll-area](components/scroll-area.md) | — | 4 arquivo(s) | 4 | pending |
| Tabs | [tabs](components/tabs.md) | — | 3 arquivo(s) | 4 | pending |
| Accordion | [accordion](components/accordion.md) | — | 0 arquivo(s) | 4 | pending |
| Breadcrumb | [breadcrumb](components/breadcrumb.md) | — | 0 arquivo(s) | 4 | pending |
| Collapsible | [collapsible](components/collapsible.md) | — | 0 arquivo(s) | 4 | pending |
| Menubar | [menubar](components/menubar.md) | — | 0 arquivo(s) | 4 | pending |
| Navigation Menu | [navigation-menu](components/navigation-menu.md) | — | 0 arquivo(s) | 4 | pending |
| Pagination | [pagination](components/pagination.md) | button | 0 arquivo(s) | 4 | pending |
| Resizable | [resizable](components/resizable.md) | — | 0 arquivo(s) | 4 | pending |
| Separator | [separator](components/separator.md) | — | 0 arquivo(s) | 4 | pending |
| Sidebar | [sidebar](components/sidebar.md) | button, input, separator, sheet, skeleton, tooltip | 0 arquivo(s) | 4 | pending |
| Alert | [alert](components/alert.md) | — | 3 arquivo(s) | 5 | pending |
| Progress | [progress](components/progress.md) | — | 2 arquivo(s) | 5 | pending |
| Skeleton | [skeleton](components/skeleton.md) | — | 1 arquivo(s) | 5 | pending |
| Toast | [toast](components/toast.md) | — | 1 arquivo(s) | 5 | pending |
| Aspect Ratio | [aspect-ratio](components/aspect-ratio.md) | — | 0 arquivo(s) | 5 | pending |
| Avatar | [avatar](components/avatar.md) | — | 0 arquivo(s) | 5 | pending |
| Button Group | [button-group](components/button-group.md) | separator | 0 arquivo(s) | 5 | pending |
| Carousel | [carousel](components/carousel.md) | button | 0 arquivo(s) | 5 | pending |
| Chart | [chart](components/chart.md) | — | 0 arquivo(s) | 5 | pending |
| Empty | [empty](components/empty.md) | — | 0 arquivo(s) | 5 | pending |
| Item | [item](components/item.md) | separator | 0 arquivo(s) | 5 | pending |
| Kbd | [kbd](components/kbd.md) | — | 0 arquivo(s) | 5 | pending |
| Sonner | [sonner](components/sonner.md) | — | 0 arquivo(s) | 5 | pending |
| Spinner | [spinner](components/spinner.md) | — | 0 arquivo(s) | 5 | pending |
| Toggle | [toggle](components/toggle.md) | — | 0 arquivo(s) | 5 | pending |
| Toggle Group | [toggle-group](components/toggle-group.md) | toggle | 0 arquivo(s) | 5 | pending |

## Plano de lotes

- **Lote 1 — piloto:** Button, Input, Card, Badge e Table.
- **Lote 2 — formulários e controles:** campos, seleção, validação e calendário.
- **Lote 3 — overlays e comandos:** diálogos, menus, popovers, sheets e drawer.
- **Lote 4 — navegação e estrutura:** sidebar, tabs, breadcrumbs, paginação e áreas de layout.
- **Lote 5 — dados e feedback:** alertas, carregamento, notificações, visualização e famílias restantes.

Apenas famílias `implemented` podem existir como componente, história e entrada na prévia. Famílias `pending` entram somente quando seu lote for iniciado.
