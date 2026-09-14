import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useGetArcoConfig } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import {
  Plus, Pencil, Trash2, Route, MapPin, Truck, Users, Shield, Check, X,
  ChevronDown, ChevronRight, Copy, KeyRound, Wifi, Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import OperatorUsuarios from "@/pages/operator-usuarios";

// ── Types ──────────────────────────────────────────────────────────────────

interface RouteRow { id: number; name: string; createdAt: string }
interface CityRow  { id: number; name: string; createdAt?: string }
interface RouteCityRow { id: number; name: string }
interface MotoristaRow { id: number; nome: string; contato: string; chavePix: string; favorecido: string; createdAt: string }
interface ConferenteRow { id: number; nome: string; createdAt: string }

// ── Generic CRUD tab ───────────────────────────────────────────────────────

function InlineEditRow({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="flex items-center gap-2 flex-1">
      <Input
        className="h-8 text-sm"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(v);
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => onSave(v)}>
        <Check className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── City assignment dialog ─────────────────────────────────────────────────

function RouteCitiesDialog({
  route,
  allCities,
  onClose,
}: {
  route: RouteRow;
  allCities: CityRow[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: assigned, isSuccess } = useQuery<RouteCityRow[]>({
    queryKey: ["route-cities", route.id],
    queryFn: () => customFetch<RouteCityRow[]>(`/api/admin/routes/${route.id}/cities`),
  });

  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isSuccess && !initialized && assigned) {
      setSelected(new Set(assigned.map((c) => c.id)));
      setInitialized(true);
    }
  }, [isSuccess, assigned, initialized]);

  const saveMutation = useMutation({
    mutationFn: (cityIds: number[]) =>
      customFetch<RouteCityRow[]>(`/api/admin/routes/${route.id}/cities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-cities", route.id] });
      toast({ title: `Cidades da ${route.name} atualizadas` });
      onClose();
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const toggle = (id: number) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filtered = allCities.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => {
    if (filtered.every((c) => selected.has(c.id))) {
      setSelected((s) => { const n = new Set(s); filtered.forEach((c) => n.delete(c.id)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); filtered.forEach((c) => n.add(c.id)); return n; });
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar cidades..."
          className="h-8 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {selected.size} selecionada(s)
        </span>
      </div>

      <div className="flex items-center gap-2 pb-1 border-b">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAll}
            className="h-3.5 w-3.5 accent-primary"
          />
          {allFilteredSelected ? "Desmarcar todas visíveis" : "Marcar todas visíveis"}
        </label>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma cidade encontrada</p>
        ) : (
          filtered.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors select-none"
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                className="h-3.5 w-3.5 accent-primary flex-shrink-0"
              />
              <span className="text-sm">{c.name}</span>
            </label>
          ))
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(Array.from(selected))}
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ── Rotas tab ──────────────────────────────────────────────────────────────

function RotasTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cityDialogRoute, setCityDialogRoute] = useState<RouteRow | null>(null);

  const { data: routes = [], isLoading } = useQuery<RouteRow[]>({
    queryKey: ["admin-routes"],
    queryFn: () => customFetch<RouteRow[]>("/api/admin/routes"),
  });

  const { data: allCities = [] } = useQuery<CityRow[]>({
    queryKey: ["admin-cities"],
    queryFn: () => customFetch<CityRow[]>("/api/admin/cities"),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      customFetch<RouteRow>("/api/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-routes"] });
      setNewName("");
      setAdding(false);
      toast({ title: "Rota adicionada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      customFetch<RouteRow>(`/api/admin/routes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-routes"] });
      setEditingId(null);
      toast({ title: "Rota atualizada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/routes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-routes"] });
      toast({ title: "Rota removida" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{routes.length} rota(s) cadastrada(s)</p>
        {!adding && (
          <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Nova Rota
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <Input
              placeholder="Ex: ROTA 01"
              className="h-8 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) createMutation.mutate(newName.trim());
                if (e.key === "Escape") { setAdding(false); setNewName(""); }
              }}
              autoFocus
            />
            <Button
              size="sm"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(newName.trim())}
            >
              {createMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); }}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* City assignment dialog */}
      <Dialog open={!!cityDialogRoute} onOpenChange={(o) => { if (!o) setCityDialogRoute(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cidades da {cityDialogRoute?.name}</DialogTitle>
          </DialogHeader>
          {cityDialogRoute && (
            <RouteCitiesDialog
              route={cityDialogRoute}
              allCities={allCities}
              onClose={() => setCityDialogRoute(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
      ) : routes.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Route className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhuma rota cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-md border">
          {routes.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <RouteRowItem
                key={r.id}
                route={r}
                isExpanded={isExpanded}
                isEditing={editingId === r.id}
                onToggleExpand={() => setExpandedId(isExpanded ? null : r.id)}
                onStartEdit={() => setEditingId(r.id)}
                onSaveEdit={(name) => { if (name.trim()) updateMutation.mutate({ id: r.id, name: name.trim() }); }}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => deleteMutation.mutate(r.id)}
                onEditCities={() => setCityDialogRoute(r)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Route row with expandable city list ────────────────────────────────────

function RouteRowItem({
  route,
  isExpanded,
  isEditing,
  onToggleExpand,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditCities,
}: {
  route: RouteRow;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onSaveEdit: (name: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditCities: () => void;
}) {
  const { data: cities = [] } = useQuery<RouteCityRow[]>({
    queryKey: ["route-cities", route.id],
    queryFn: () => customFetch<RouteCityRow[]>(`/api/admin/routes/${route.id}/cities`),
  });

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={onToggleExpand}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title={isExpanded ? "Recolher" : "Ver cidades"}
        >
          {isExpanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>

        {isEditing ? (
          <InlineEditRow value={route.name} onSave={onSaveEdit} onCancel={onCancelEdit} />
        ) : (
          <>
            <span
              className="flex-1 text-sm font-medium cursor-pointer"
              onClick={onToggleExpand}
            >
              {route.name}
            </span>
            <span className="text-xs text-muted-foreground mr-1">
              {cities.length > 0 ? `${cities.length} cidade(s)` : ""}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 px-2"
              onClick={onEditCities}
            >
              <MapPin className="h-3 w-3" />
              Cidades
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={onStartEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover rota?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A rota <strong>{route.name}</strong> e todas as suas cidades vinculadas serão removidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={onDelete}
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {isExpanded && (
        <div className="px-9 pb-3">
          {cities.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Nenhuma cidade vinculada — clique em "Cidades" para adicionar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {cities.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                >
                  <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cidades tab ─────────────────────────────────────────────────────────────

function CidadesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: cities = [], isLoading } = useQuery<CityRow[]>({
    queryKey: ["admin-cities"],
    queryFn: () => customFetch<CityRow[]>("/api/admin/cities"),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      customFetch<CityRow>("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cities"] });
      setNewName("");
      setAdding(false);
      toast({ title: "Cidade adicionada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      customFetch<CityRow>(`/api/admin/cities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cities"] });
      setEditingId(null);
      toast({ title: "Cidade atualizada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/cities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cities"] });
      toast({ title: "Cidade removida" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{cities.length} cidade(s) cadastrada(s)</p>
        {!adding && (
          <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Nova Cidade
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <Input
              placeholder="Ex: SAO PAULO"
              className="h-8 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) createMutation.mutate(newName.trim());
                if (e.key === "Escape") { setAdding(false); setNewName(""); }
              }}
              autoFocus
            />
            <Button
              size="sm"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(newName.trim())}
            >
              {createMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); }}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
      ) : cities.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhuma cidade cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-md border">
          {cities.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              {editingId === c.id ? (
                <InlineEditRow
                  value={c.name}
                  onSave={(v) => { if (v.trim()) updateMutation.mutate({ id: c.id, name: v.trim() }); }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setEditingId(c.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover cidade?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A cidade <strong>{c.name}</strong> será removida da lista.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(c.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Motoristas tab ─────────────────────────────────────────────────────────

export function MotoristasTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", contato: "", chavePix: "", favorecido: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", contato: "", chavePix: "", favorecido: "" });

  const { data: motoristas = [], isLoading } = useQuery<MotoristaRow[]>({
    queryKey: ["admin-motoristas"],
    queryFn: () => customFetch<MotoristaRow[]>("/api/admin/motoristas"),
  });

  const createMutation = useMutation({
    mutationFn: (data: { nome: string; contato: string; chavePix: string; favorecido: string }) =>
      customFetch<MotoristaRow>("/api/admin/motoristas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-motoristas"] });
      setForm({ nome: "", contato: "", chavePix: "", favorecido: "" });
      setOpen(false);
      toast({ title: "Motorista adicionado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; nome: string; contato: string; chavePix: string; favorecido: string }) =>
      customFetch<MotoristaRow>(`/api/admin/motoristas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-motoristas"] });
      setEditingId(null);
      toast({ title: "Motorista atualizado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/motoristas/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-motoristas"] });
      toast({ title: "Motorista removido" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const startEdit = (m: MotoristaRow) => {
    setEditingId(m.id);
    setEditForm({ nome: m.nome, contato: m.contato, chavePix: m.chavePix ?? "", favorecido: m.favorecido ?? "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{motoristas.length} motorista(s) cadastrado(s)</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar motorista</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.nome.trim())
                  createMutation.mutate({
                    nome: form.nome.trim(),
                    contato: form.contato.trim(),
                    chavePix: form.chavePix.trim(),
                    favorecido: form.favorecido.trim(),
                  });
              }}
            >
              <div className="space-y-1.5">
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ex: João Silva"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contato / Telefone</Label>
                <Input
                  placeholder="Ex: (11) 9 9999-9999"
                  value={form.contato}
                  onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Chave PIX</Label>
                <Input
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  value={form.chavePix}
                  onChange={(e) => setForm((f) => ({ ...f, chavePix: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Favorecido</Label>
                <Input
                  placeholder="Nome de quem recebe o pagamento (se diferente do motorista)"
                  value={form.favorecido}
                  onChange={(e) => setForm((f) => ({ ...f, favorecido: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!form.nome.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
      ) : motoristas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum motorista cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-md border">
          {motoristas.map((m) => (
            <div key={m.id} className="px-4 py-3">
              {editingId === m.id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    className="h-8 text-sm flex-1 min-w-32"
                    placeholder="Nome"
                    value={editForm.nome}
                    onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                  <Input
                    className="h-8 text-sm flex-1 min-w-32"
                    placeholder="Contato"
                    value={editForm.contato}
                    onChange={(e) => setEditForm((f) => ({ ...f, contato: e.target.value }))}
                  />
                  <Input
                    className="h-8 text-sm flex-1 min-w-32"
                    placeholder="Chave PIX"
                    value={editForm.chavePix}
                    onChange={(e) => setEditForm((f) => ({ ...f, chavePix: e.target.value }))}
                  />
                  <Input
                    className="h-8 text-sm flex-1 min-w-32"
                    placeholder="Favorecido"
                    value={editForm.favorecido}
                    onChange={(e) => setEditForm((f) => ({ ...f, favorecido: e.target.value }))}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600"
                    onClick={() => {
                      if (editForm.nome.trim())
                        updateMutation.mutate({
                          id: m.id,
                          nome: editForm.nome.trim(),
                          contato: editForm.contato.trim(),
                          chavePix: editForm.chavePix.trim(),
                          favorecido: editForm.favorecido.trim(),
                        });
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.nome}</p>
                    {m.contato && (
                      <p className="text-xs text-muted-foreground">{m.contato}</p>
                    )}
                    {(m.chavePix || m.favorecido) && (
                      <p className="text-xs text-muted-foreground truncate">
                        PIX: {m.chavePix || "—"}{m.favorecido ? ` · ${m.favorecido}` : ""}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground flex-shrink-0"
                    onClick={() => startEdit(m)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 flex-shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover motorista?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{m.nome}</strong> será removido da lista de motoristas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(m.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Conferentes tab ────────────────────────────────────────────────────────

function ConferentesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const { data: conferentes = [], isLoading } = useQuery<ConferenteRow[]>({
    queryKey: ["admin-conferentes"],
    queryFn: () => customFetch<ConferenteRow[]>("/api/admin/conferentes"),
  });

  const createMutation = useMutation({
    mutationFn: (nome: string) =>
      customFetch<ConferenteRow>("/api/admin/conferentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-conferentes"] });
      setForm({ nome: "" });
      setOpen(false);
      toast({ title: "Conferente adicionado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) =>
      customFetch<ConferenteRow>(`/api/admin/conferentes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-conferentes"] });
      setEditingId(null);
      toast({ title: "Conferente atualizado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/conferentes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-conferentes"] });
      toast({ title: "Conferente removido" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{conferentes.length} conferente(s) cadastrado(s)</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Conferente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar conferente</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.nome.trim()) createMutation.mutate(form.nome.trim());
              }}
            >
              <div className="space-y-1.5">
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ex: Maria Oliveira"
                  value={form.nome}
                  onChange={(e) => setForm({ nome: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!form.nome.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : conferentes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum conferente cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-md border">
          {conferentes.map((conferente) => (
            <div key={conferente.id} className="px-4 py-3">
              {editingId === conferente.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 flex-1 text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editName.trim()) {
                        updateMutation.mutate({ id: conferente.id, nome: editName.trim() });
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600"
                    disabled={!editName.trim() || updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: conferente.id, nome: editName.trim() })}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <p className="flex-1 text-sm font-medium">{conferente.nome}</p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => {
                      setEditingId(conferente.id);
                      setEditName(conferente.nome);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover conferente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{conferente.nome}</strong> será removido da lista de conferentes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(conferente.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Integração Arco ─────────────────────────────────────────────────────────

function ArcoIntegrationTab() {
  const { toast } = useToast();
  const { data: config, isLoading, isError, refetch } = useGetArcoConfig();

  const apiBaseUrl = window.location.origin;
  const lookupUrl = `${apiBaseUrl}/api/arco/lookup?code=CODIGO_DE_RASTREIO`;
  const pingUrl = `${apiBaseUrl}/api/arco/ping`;

  async function copyText(value: string, label: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      toast({ title: `${label} copiada` });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Selecione e copie manualmente.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando integração Arco...</p>;
  }

  if (isError || !config) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar a integração Arco.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!config.configured ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex gap-3 py-5">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-medium text-amber-950">Integração ainda não configurada</p>
              <p className="mt-1 text-sm text-amber-900/80">
                Defina a chave secreta <code>ARCO_API_KEY</code> para liberar as consultas do sistema Arco.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-4 text-sm text-emerald-900">
            A integração está ativa. Compartilhe os dados de acesso somente por um canal seguro com a equipe autorizada da Loggi.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-5 py-5">
          <div>
            <h3 className="font-semibold">Consulta de pacote</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O Arco consulta esta URL ao bipar um código. A resposta informa cidade, rota e operação.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>URL de exemplo</Label>
            <div className="flex gap-2">
              <Input readOnly value={lookupUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyText(lookupUrl, "URL")}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copiar URL</span>
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Chave da API</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={config.maskedApiKey ?? "Chave não configurada"}
                className="font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A chave completa nunca é exibida no navegador. Compartilhe-a somente por um canal seguro e prefira o cabeçalho <code>X-API-Key</code>. O parâmetro <code>apiKey</code> também é aceito quando necessário.
            </p>
          </div>

          <div className="space-y-1.5 border-t pt-5">
            <Label className="flex items-center gap-2">
              <Wifi className="h-4 w-4" /> Teste de conectividade
            </Label>
            <div className="flex gap-2">
              <Input readOnly value={pingUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyText(pingUrl, "URL de teste")}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copiar URL de teste</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Este endpoint não exige chave e retorna o status da integração.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Filiais tab (plano de filiais dentro da AMAZON) ─────────────────────────
//
// Filial é uma subdivisão só da AMAZON. Cada filial tem um código curto
// (travado depois de criado — é o valor gravado em packages.filial etc.) e
// uma lista de cidades exclusiva (uma cidade só pode estar numa filial —
// garantido pelo backend, não só pela tela).

interface FilialRow { id: number; code: string; name: string; isActive: boolean }
interface FilialCityRow { id: number; city: string }

function FilialCitiesDialog({ filial, onClose }: { filial: FilialRow; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newCity, setNewCity] = useState("");

  const { data: cities = [], isLoading } = useQuery<FilialCityRow[]>({
    queryKey: ["filial-cities", filial.id],
    queryFn: () => customFetch<FilialCityRow[]>(`/api/admin/filiais/${filial.id}/cities`),
  });

  const addMutation = useMutation({
    mutationFn: (city: string) =>
      customFetch<FilialCityRow>(`/api/admin/filiais/${filial.id}/cities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filial-cities", filial.id] });
      setNewCity("");
      toast({ title: "Cidade vinculada à filial" });
    },
    onError: (err: any) => toast({ title: "Não foi possível vincular", description: err?.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/filial-cities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filial-cities", filial.id] });
      toast({ title: "Cidade desvinculada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cidades da filial <strong>{filial.code}</strong>. Cada cidade só pode pertencer a uma filial — se ela já
        estiver em outra, a vinculação é recusada.
      </p>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Ex: ITABUNA"
          className="h-8 text-sm"
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newCity.trim()) addMutation.mutate(newCity.trim());
          }}
          autoFocus
        />
        <Button
          size="sm"
          disabled={!newCity.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate(newCity.trim())}
        >
          {addMutation.isPending ? "Adicionando..." : "Adicionar"}
        </Button>
      </div>

      <div className="max-h-64 overflow-y-auto divide-y rounded-md border">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
        ) : cities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma cidade vinculada ainda</p>
        ) : (
          cities.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-sm">{c.city}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => removeMutation.mutate(c.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}

// ── Rotas por CEP de uma filial (ver plano-implementacao-filiais-amazon.md,
// seção Vitória da Conquista) ───────────────────────────────────────────────
//
// Conceito NOVO e diferente da aba "Rotas" já existente (aquela é rota por
// cidade inteira, só pra LOGGI/Arco). Esta aqui é rota por CEP, só dentro de
// uma filial da AMAZON — por isso o botão nesta tela chama "CEPs", não
// "Rotas", pra não confundir as duas coisas na mesma página.

interface FilialRouteRow { id: number; code: string; name: string; isActive: boolean }
interface RouteCepRow { id: number; cep: string; bairro: string | null }

function RouteCepsList({ route }: { route: FilialRouteRow }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newCep, setNewCep] = useState("");
  const [newBairro, setNewBairro] = useState("");

  const { data: ceps = [], isLoading } = useQuery<RouteCepRow[]>({
    queryKey: ["route-ceps", route.id],
    queryFn: () => customFetch<RouteCepRow[]>(`/api/admin/filial-routes/${route.id}/ceps`),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      customFetch<RouteCepRow>(`/api/admin/filial-routes/${route.id}/ceps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: newCep, bairro: newBairro }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-ceps", route.id] });
      setNewCep("");
      setNewBairro("");
    },
    onError: (err: any) => toast({ title: "Não foi possível adicionar o CEP", description: err?.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/route-ceps/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["route-ceps", route.id] }),
  });

  return (
    <div className="pl-4 pr-2 py-2 space-y-2 bg-muted/30 rounded-md">
      <div className="flex items-center gap-2">
        <Input
          placeholder="CEP (ex: 45000010)"
          className="h-7 text-xs w-40"
          value={newCep}
          onChange={(e) => setNewCep(e.target.value)}
        />
        <Input
          placeholder="Bairro (opcional, só referência)"
          className="h-7 text-xs flex-1"
          value={newBairro}
          onChange={(e) => setNewBairro(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newCep.trim()) addMutation.mutate(); }}
        />
        <Button size="sm" className="h-7 text-xs" disabled={!newCep.trim() || addMutation.isPending} onClick={() => addMutation.mutate()}>
          Adicionar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">Carregando...</p>
      ) : ceps.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhum CEP vinculado ainda</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {ceps.length} CEP(s) vinculado(s)
          {ceps.length <= 12 && (
            <span className="ml-1">
              ({ceps.map((c) => c.cep).join(", ")})
            </span>
          )}
        </p>
      )}
      {ceps.length > 0 && ceps.length <= 12 && (
        <div className="flex flex-wrap gap-1.5">
          {ceps.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-background border rounded px-1.5 py-0.5">
              {c.cep}{c.bairro ? ` · ${c.bairro}` : ""}
              <button className="text-destructive" onClick={() => removeMutation.mutate(c.id)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FilialRoutesDialog({ filial }: { filial: FilialRow }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: routes = [], isLoading } = useQuery<FilialRouteRow[]>({
    queryKey: ["filial-routes", filial.id],
    queryFn: () => customFetch<FilialRouteRow[]>(`/api/admin/filiais/${filial.id}/routes`),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      customFetch<FilialRouteRow>(`/api/admin/filiais/${filial.id}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, name: newName }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filial-routes", filial.id] });
      setNewCode("");
      setNewName("");
      toast({ title: "Rota criada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/filial-routes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filial-routes", filial.id] });
      toast({ title: "Rota removida" });
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rotas por CEP/bairro dentro da filial <strong>{filial.code}</strong>. Um pacote da AMAZON grava a rota
        sozinho a partir do CEP da planilha de importação — só existe pra quem tem CEP cadastrado aqui.
      </p>

      <div className="flex items-center gap-2">
        <Input placeholder="Código (ex: CENTRO)" className="h-8 text-sm w-36" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
        <Input
          placeholder="Nome (ex: Centro)"
          className="h-8 text-sm flex-1"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newCode.trim() && newName.trim()) createMutation.mutate(); }}
        />
        <Button size="sm" disabled={!newCode.trim() || !newName.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
          Nova rota
        </Button>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y rounded-md border">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
        ) : routes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma rota cadastrada ainda</p>
        ) : (
          routes.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  className="flex items-center gap-1.5 flex-1 text-left"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  {expanded === r.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <span className="text-sm font-mono font-semibold">{r.code}</span>
                  <span className="text-sm text-muted-foreground">{r.name}</span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => removeMutation.mutate(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {expanded === r.id && <RouteCepsList route={r} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FiliaisTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [citiesDialogFilial, setCitiesDialogFilial] = useState<FilialRow | null>(null);
  const [routesDialogFilial, setRoutesDialogFilial] = useState<FilialRow | null>(null);

  const { data: filiais = [], isLoading } = useQuery<FilialRow[]>({
    queryKey: ["admin-filiais"],
    queryFn: () => customFetch<FilialRow[]>("/api/admin/filiais"),
  });

  const createMutation = useMutation({
    mutationFn: (values: { code: string; name: string }) =>
      customFetch<FilialRow>("/api/admin/filiais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-filiais"] });
      setNewCode("");
      setNewName("");
      setAdding(false);
      toast({ title: "Filial criada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      customFetch<FilialRow>(`/api/admin/filiais/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-filiais"] });
      setEditingId(null);
      toast({ title: "Filial atualizada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      customFetch<FilialRow>(`/api/admin/filiais/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-filiais"] }),
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/filiais/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-filiais"] });
      toast({ title: "Filial removida" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filiais.length} filial(is) cadastrada(s)</p>
        {!adding && (
          <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Nova Filial
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Código (ex: ITABUNA)"
              className="h-8 text-sm w-40"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Nome (opcional)"
              className="h-8 text-sm flex-1 min-w-40"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCode.trim()) createMutation.mutate({ code: newCode.trim(), name: newName.trim() });
                if (e.key === "Escape") { setAdding(false); setNewCode(""); setNewName(""); }
              }}
            />
            <Button
              size="sm"
              disabled={!newCode.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ code: newCode.trim(), name: newName.trim() })}
            >
              {createMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewCode(""); setNewName(""); }}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
      ) : filiais.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhuma filial cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-md border">
          {filiais.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-sm font-mono font-semibold w-28 flex-shrink-0">{f.code}</span>
              {editingId === f.id ? (
                <InlineEditRow
                  value={f.name}
                  onSave={(v) => updateMutation.mutate({ id: f.id, name: v.trim() })}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <span className="flex-1 text-sm text-muted-foreground">{f.name || "—"}</span>
                  {!f.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inativa</span>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCitiesDialogFilial(f)}>
                    Cidades
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRoutesDialogFilial(f)}>
                    CEPs
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setEditingId(f.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    title={f.isActive ? "Desativar filial" : "Ativar filial"}
                    onClick={() => toggleActiveMutation.mutate({ id: f.id, isActive: !f.isActive })}
                  >
                    {f.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover filial?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A filial <strong>{f.code}</strong> e seus vínculos de cidade serão removidos. Isso não apaga
                          pacotes/bipagens já registrados — eles mantêm a filial gravada no histórico.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(f.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!citiesDialogFilial} onOpenChange={(o) => { if (!o) setCitiesDialogFilial(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cidades da {citiesDialogFilial?.code}</DialogTitle>
          </DialogHeader>
          {citiesDialogFilial && (
            <FilialCitiesDialog filial={citiesDialogFilial} onClose={() => setCitiesDialogFilial(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!routesDialogFilial} onOpenChange={(o) => { if (!o) setRoutesDialogFilial(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rotas por CEP — {routesDialogFilial?.code}</DialogTitle>
          </DialogHeader>
          {routesDialogFilial && <FilialRoutesDialog filial={routesDialogFilial} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;
  const isAdmin = role === "admin" || role === "operator";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
        <p className="text-muted-foreground text-sm mt-1">
           Cadastre e gerencie rotas, cidades, motoristas, conferentes e usuários do sistema.
        </p>
      </div>

      <Tabs defaultValue="rotas">
        <TabsList className="mb-4 h-auto flex-wrap justify-start">
          <TabsTrigger value="rotas" className="gap-1.5">
            <Route className="h-4 w-4" /> Rotas
          </TabsTrigger>
          <TabsTrigger value="cidades" className="gap-1.5">
            <MapPin className="h-4 w-4" /> Cidades
          </TabsTrigger>
          <TabsTrigger value="filiais" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Filiais
          </TabsTrigger>
          <TabsTrigger value="motoristas" className="gap-1.5">
            <Truck className="h-4 w-4" /> Motoristas
          </TabsTrigger>
          <TabsTrigger value="conferentes" className="gap-1.5">
            <Users className="h-4 w-4" /> Conferentes
          </TabsTrigger>
          <TabsTrigger value="usuarios-operadores" className="gap-1.5">
            <Shield className="h-4 w-4" /> Operadores
          </TabsTrigger>
          <TabsTrigger value="usuarios-motoristas" className="gap-1.5">
            <Users className="h-4 w-4" /> Usuários Motoristas
          </TabsTrigger>
          <TabsTrigger value="arco" className="gap-1.5">
            <KeyRound className="h-4 w-4" /> Integração Arco
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rotas">
          <RotasTab />
        </TabsContent>

        <TabsContent value="cidades">
          <CidadesTab />
        </TabsContent>

        <TabsContent value="filiais">
          <FiliaisTab />
        </TabsContent>

        <TabsContent value="motoristas">
          <MotoristasTab />
        </TabsContent>
        <TabsContent value="conferentes">
          <ConferentesTab />
        </TabsContent>

        <TabsContent value="usuarios-operadores">
            <OperatorUsuarios />
        </TabsContent>

        <TabsContent value="usuarios-motoristas">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gerencie as contas de login dos motoristas — usuário, senha e rotas liberadas.
              </p>
              <Link href="/usuarios">
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Abrir gestão de usuários motoristas
                </Button>
              </Link>
            </div>
        </TabsContent>
        <TabsContent value="arco">
          <ArcoIntegrationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
