import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import {
  Plus, Pencil, Trash2, Route, MapPin, Truck, Users, Shield, Check, X,
  ChevronDown, ChevronRight,
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

// ── Types ──────────────────────────────────────────────────────────────────

interface RouteRow { id: number; name: string; createdAt: string }
interface CityRow  { id: number; name: string; createdAt?: string }
interface RouteCityRow { id: number; name: string }
interface MotoristaRow { id: number; nome: string; contato: string; createdAt: string }

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

  const { data: assigned = [] } = useQuery<RouteCityRow[]>({
    queryKey: ["route-cities", route.id],
    queryFn: () => customFetch<RouteCityRow[]>(`/api/admin/routes/${route.id}/cities`),
  });

  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  // Sync selected from fetched data once
  const [synced, setSynced] = useState(false);
  if (!synced && assigned.length >= 0) {
    setSelected(new Set(assigned.map((c) => c.id)));
    setSynced(true);
  }

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
    enabled: isExpanded,
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

function MotoristasTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", contato: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", contato: "" });

  const { data: motoristas = [], isLoading } = useQuery<MotoristaRow[]>({
    queryKey: ["admin-motoristas"],
    queryFn: () => customFetch<MotoristaRow[]>("/api/admin/motoristas"),
  });

  const createMutation = useMutation({
    mutationFn: (data: { nome: string; contato: string }) =>
      customFetch<MotoristaRow>("/api/admin/motoristas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-motoristas"] });
      setForm({ nome: "", contato: "" });
      setOpen(false);
      toast({ title: "Motorista adicionado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; nome: string; contato: string }) =>
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
    setEditForm({ nome: m.nome, contato: m.contato });
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
                if (form.nome.trim()) createMutation.mutate({ nome: form.nome.trim(), contato: form.contato.trim() });
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600"
                    onClick={() => {
                      if (editForm.nome.trim())
                        updateMutation.mutate({ id: m.id, nome: editForm.nome.trim(), contato: editForm.contato.trim() });
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
          Cadastre e gerencie rotas, cidades, motoristas e usuários do sistema.
        </p>
      </div>

      <Tabs defaultValue="rotas">
        <TabsList className="mb-4">
          <TabsTrigger value="rotas" className="gap-1.5">
            <Route className="h-4 w-4" /> Rotas
          </TabsTrigger>
          <TabsTrigger value="cidades" className="gap-1.5">
            <MapPin className="h-4 w-4" /> Cidades
          </TabsTrigger>
          <TabsTrigger value="motoristas" className="gap-1.5">
            <Truck className="h-4 w-4" /> Motoristas
          </TabsTrigger>
          <TabsTrigger value="usuarios-operadores" className="gap-1.5">
            <Shield className="h-4 w-4" /> Operadores
          </TabsTrigger>
          <TabsTrigger value="usuarios-motoristas" className="gap-1.5">
            <Users className="h-4 w-4" /> Usuários Motoristas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rotas">
          <RotasTab />
        </TabsContent>

        <TabsContent value="cidades">
          <CidadesTab />
        </TabsContent>

        <TabsContent value="motoristas">
          <MotoristasTab />
        </TabsContent>

        <TabsContent value="usuarios-operadores">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gerencie as contas de operadores — operações e módulos permitidos.
            </p>
            <Link href="/operadores">
              <Button variant="outline" className="gap-2">
                <Shield className="h-4 w-4" />
                Abrir gestão de operadores
              </Button>
            </Link>
          </div>
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
      </Tabs>
    </div>
  );
}
