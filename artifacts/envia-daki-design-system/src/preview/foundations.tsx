import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Guidelines } from './parts';

const CORE_SWATCHES = [
  { name: 'Primary', className: 'bg-primary' },
  { name: 'Secondary', className: 'bg-secondary' },
  { name: 'Accent', className: 'bg-accent' },
] as const;

const SUPPORTING_SWATCHES = [
  { name: 'Background', className: 'border bg-background' },
  { name: 'Foreground', className: 'bg-foreground' },
  { name: 'Muted', className: 'bg-muted' },
  { name: 'Destructive', className: 'bg-destructive' },
  { name: 'Border', className: 'bg-border' },
] as const;

const OPERATION_SWATCHES = [
  { name: 'LOGGI / primary', className: 'bg-primary' },
  { name: 'AMAZON / signal', className: 'bg-chart-3' },
] as const;

const TYPE_SCALE = [
  { label: 'Display', className: 'text-4xl font-bold' },
  { label: 'Heading', className: 'text-2xl font-semibold' },
  { label: 'Body', className: 'text-base' },
  { label: 'Label', className: 'text-sm font-medium' },
  { label: 'Caption', className: 'text-sm text-muted-foreground' },
] as const;

const SPACING_SCALE = [
  { label: '4', className: 'w-4' },
  { label: '8', className: 'w-8' },
  { label: '12', className: 'w-12' },
  { label: '16', className: 'w-16' },
  { label: '24', className: 'w-24' },
] as const;

function Swatch({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <div className={`h-16 rounded-lg ${className}`} />
      <p className="text-sm font-medium">{name}</p>
    </div>
  );
}

export function OverviewPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sistema operacional
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Uma base visual compacta para decisões rápidas no armazém: contraste
          alto, estados explícitos e dados fáceis de escanear.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {CORE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tipografia
          </h2>
          <div className="mt-4 space-y-3">
            {TYPE_SCALE.map((entry) => (
              <p key={entry.label} className={entry.className}>
                {entry.label}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Composição
          </h2>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Nova conferência</CardTitle>
              <CardDescription>
                Componentes compostos com os tokens acima.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="overview-name" className="text-sm font-medium">
                  Código da rota
                </label>
                <Input id="overview-name" placeholder="Ex.: RTE-2026-081" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                <span>Conferência ativa</span>
                <Badge className="ml-auto">12 pacotes</Badge>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button>Iniciar</Button>
              <Button variant="outline">Cancelar</Button>
            </CardFooter>
          </Card>
        </section>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Componentes
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Confirmar</Button>
          <Button variant="secondary">Secundária</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Discreta</Button>
          <Badge>Conferido</Badge>
          <Badge variant="secondary">Pendente</Badge>
          <Badge variant="outline">Rota</Badge>
        </div>
      </section>
      <section className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dados operacionais
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pacote</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono font-medium">TBR123456789</TableCell>
              <TableCell>AMAZON</TableCell>
              <TableCell><Badge variant="secondary">Conferido</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono font-medium">BR459028174</TableCell>
              <TableCell>LOGGI</TableCell>
              <TableCell><Badge variant="outline">Pendente</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Princípios
        </h2>
        <div className="mt-4">
          <Guidelines
            items={[
              { kind: 'do', text: 'Use o azul-ciano para ação, foco e navegação ativa.' },
              { kind: 'do', text: 'Use etiquetas curtas e estados visíveis para leitura em operação.' },
              { kind: 'dont', text: 'Não use cor sozinha para comunicar erro ou bloqueio.' },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

export function LogoPage() {
  return (
    <div className="space-y-6 rounded-xl border bg-card p-6 text-card-foreground">
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Assinatura principal
        </p>
        <div className="mt-4 flex min-h-40 items-center justify-center rounded-lg bg-sidebar p-8">
          <img
            src={`${import.meta.env.BASE_URL}enviadaki-logo.png`}
            alt="Envia Daki"
            className="h-auto w-64 max-w-full"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Logo transparente para fundos claros e escuros. Preserve a proporção,
          a área de respiro e o contraste da assinatura.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-background p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fundo claro
          </p>
          <div className="mt-4 flex min-h-24 items-center justify-center rounded-md bg-white p-5">
            <img
              src={`${import.meta.env.BASE_URL}enviadaki-logo.png`}
              alt=""
              className="h-auto w-48 max-w-full"
            />
          </div>
        </div>
        <div className="rounded-lg border bg-background p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fundo de navegação
          </p>
          <div className="mt-4 flex min-h-24 items-center justify-center rounded-md bg-sidebar p-5">
            <img
              src={`${import.meta.env.BASE_URL}enviadaki-logo.png`}
              alt=""
              className="h-auto w-48 max-w-full"
            />
          </div>
        </div>
      </section>
      <Guidelines
        items={[
          { kind: 'do', text: 'Mantenha a assinatura inteira e sem distorção.' },
          { kind: 'do', text: 'Prefira a navegação escura quando o logo aparecer no shell do produto.' },
          { kind: 'dont', text: 'Não aplique sombras, gradientes ou novas cores ao arquivo.' },
        ]}
      />
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Brand colors</h2>
          <p className="text-sm text-muted-foreground">
            The core roles used for emphasis, supporting actions, and accents.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {CORE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="font-semibold">Sinais de operação</h2>
          <p className="text-sm text-muted-foreground">
            A operação AMAZON usa laranja como sinal contextual; o azul continua
            reservado à ação e ao foco do produto.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {OPERATION_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Semantic and surface colors</h2>
          <p className="text-sm text-muted-foreground">
            Roles for text, backgrounds, borders, muted content, and danger.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SUPPORTING_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>
      <Guidelines
        items={[
          { kind: 'do', text: 'Use cor semântica junto de texto, ícone ou estado explícito.' },
          { kind: 'dont', text: 'Não transforme o laranja da AMAZON em cor global de ação.' },
        ]}
      />
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      <section>
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Font family
        </h2>
        <p className="mt-4 text-4xl font-bold">The quick brown fox</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The token font family is applied across this entire preview.
        </p>
      </section>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Type scale
        </h2>
        {TYPE_SCALE.map((entry) => (
          <div key={entry.label} className="grid gap-2 sm:grid-cols-[88px_1fr]">
            <span className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {entry.label}
            </span>
            <p className={entry.className}>Build products people understand.</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export function LayoutPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Spacing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The spacing scale, derived from the base spacing token.
        </p>
        <div className="mt-6 space-y-4">
          {SPACING_SCALE.map((space) => (
            <div key={space.label} className="flex items-center gap-4">
              <span className="w-8 text-xs text-muted-foreground">
                {space.label}
              </span>
              <div className={`h-3 rounded-full bg-primary ${space.className}`} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Radius</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Corner treatments derive from the base radius token.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Small', className: 'rounded-sm' },
            { label: 'Medium', className: 'rounded-md' },
            { label: 'Large', className: 'rounded-lg' },
            { label: 'Extra large', className: 'rounded-xl' },
          ].map((radius) => (
            <div
              key={radius.label}
              className={`flex h-24 items-end border bg-muted p-3 ${radius.className}`}
            >
              <span className="text-xs font-medium">{radius.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
