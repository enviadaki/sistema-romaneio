import { lazy, type ComponentType } from 'react';
import {
  ColorsPage,
  FontsPage,
  LayoutPage,
  LogoPage,
  OverviewPage,
} from './foundations';

function lazyPage(load: () => Promise<ComponentType>) {
  return lazy(async () => ({ default: await load() }));
}

const BadgeDemo = lazyPage(() =>
  import('./demos/badge').then(({ BadgeDemo }) => BadgeDemo),
);
const ButtonDemo = lazyPage(() =>
  import('./demos/button').then(({ ButtonDemo }) => ButtonDemo),
);
const CardDemo = lazyPage(() =>
  import('./demos/card').then(({ CardDemo }) => CardDemo),
);
const InputDemo = lazyPage(() =>
  import('./demos/input').then(({ InputDemo }) => InputDemo),
);
const TableDemo = lazyPage(() =>
  import('./demos/table').then(({ TableDemo }) => TableDemo),
);

export type PreviewEntry = {
  id: string;
  name: string;
  description: string;
  Page: ComponentType;
};

export type NavGroup = {
  name: string;
  entries: PreviewEntry[];
};

export const DESIGN_SYSTEM = {
  title: 'Envia Daki Design System',
  description:
    'A linguagem visual operacional do Sistema de Romaneios: clara, densa e pronta para escalar entre LOGGI e AMAZON.',
} as const;

export const OVERVIEW_ENTRY: PreviewEntry = {
  id: 'overview',
  name: 'Visão geral',
  description: 'Princípios e fundamentos que orientam o sistema.',
  Page: OverviewPage,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Marca',
    entries: [
      {
        id: 'brand-logo',
        name: 'Logo e assinatura',
        description: 'Uso do logo transparente e assinatura do produto.',
        Page: LogoPage,
      },
    ],
  },
  {
    name: 'Cores',
    entries: [
      {
        id: 'color-roles',
        name: 'Papéis de cor',
        description: 'Marca, operações, semântica, superfícies e bordas.',
        Page: ColorsPage,
      },
    ],
  },
  {
    name: 'Tipografia',
    entries: [
      {
        id: 'type-scale',
        name: 'Escala tipográfica',
        description: 'Inter, títulos, corpo, rótulos e dados operacionais.',
        Page: FontsPage,
      },
    ],
  },
  {
    name: 'Layout',
    entries: [
      {
        id: 'spacing-radius',
        name: 'Espaçamento e raio',
        description: 'Ritmo compacto e tratamentos de canto do sistema.',
        Page: LayoutPage,
      },
    ],
  },
  {
    name: 'Ações',
    entries: [
      {
        id: 'button',
        name: 'Button',
        description: 'Ações primárias, secundárias, discretas e destrutivas.',
        Page: ButtonDemo,
      },
    ],
  },
  {
    name: 'Formulários',
    entries: [
      {
        id: 'input',
        name: 'Input',
        description: 'Entrada de texto, código de pacote e validação.',
        Page: InputDemo,
      },
    ],
  },
  {
    name: 'Dados',
    entries: [
      {
        id: 'badge',
        name: 'Badge',
        description: 'Status compactos para operação e conferência.',
        Page: BadgeDemo,
      },
      {
        id: 'card',
        name: 'Card',
        description: 'Superfícies para agrupamento de dados e ações.',
        Page: CardDemo,
      },
      {
        id: 'table',
        name: 'Table',
        description: 'Listas densas de pacotes, rotas e auditoria.',
        Page: TableDemo,
      },
    ],
  },
];

export const ALL_ENTRIES: PreviewEntry[] = [
  OVERVIEW_ENTRY,
  ...NAV_GROUPS.flatMap((group) => group.entries),
];

const duplicateIds = ALL_ENTRIES.map((entry) => entry.id).filter(
  (id, index, ids) => ids.indexOf(id) !== index,
);
if (duplicateIds.length > 0) {
  throw new Error(
    `Duplicate preview page id(s): ${[...new Set(duplicateIds)].join(', ')}.`,
  );
}