import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Plus, Pencil, Trash2, User, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { OPERATOR_PAGES, groupedPages, type PageDef } from "@/lib/operator-pages";

const OPERATION_OPTIONS = ["LOGGI", "AMAZON"];

interface OperatorUser {
  id: number;
  username: string;
  fullName: string;
  allowedOperations: string[];
  allowedPages: string[];
  canManageMotoristas: boolean;
  isActive: boolean;
  createdAt: string;
}

interface CreateForm {
  username: string;
  fullName: string;
  password: string;
  allowedOperations: string[];
  allowedPages: string[];
  canManageMotoristas: boolean;
}

const emptyForm: CreateForm = {
  username: "",
  fullName: "",
  password: "",
  allowedOperations: [],
  allowedPages: [],
  canManageMotoristas: false,
};

const PAGE_GROUPS = groupedPages();

function PageCheckboxGroup({
  pages,
  selected,
  onToggle,
}: {
  pages: PageDef[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {pages.map((p) => (
        <label
          key={p.key}
          className="flex items-center gap-2 cursor-pointer select-none rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
        >
          <Checkbox
            checked={selected.includes(p.key)}
            onCheckedChange={() => onToggle(p.key)}
          />
          <span className="text-sm">{p.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function OperatorUsuarios() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<OperatorUser | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const role = user?.publicMetadata?.role as string | undefined;
  const isAdmin = role === "admin" || role === "operator";

  const { data: users = [], isLoading } = useQuery<OperatorUser[]>({
    queryKey: ["admin-operator-users"],
    queryFn: () => customFetch<OperatorUser[]>("/api/admin/operator-users"),
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number | null; values: CreateForm }) => {
      if (id) {
        return customFetch<OperatorUser>(`/api/admin/operator-users/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: values.fullName.trim(),
            password: values.password || undefined,
            allowedOperations: values.allowedOperations,
            allowedPages: values.allowedPages,
            canManageMotoristas: values.canManageMotoristas,
          }),
        });
      }
      return customFetch<OperatorUser>("/api/admin/operator-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-operator-users"] });
      toast({ title: variables.id ? "Operador atualizado com sucesso" : `Operador ${form.username} criado com sucesso` });
      setForm(emptyForm);
      setEditingUser(null);
      setOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: editingUser ? "Erro ao atualizar operador" : "Erro ao criar operador",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/operator-users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-operator-users"] });
      toast({ title: "Operador removido com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover", description: String(err?.message ?? err), variant: "destructive" });
    },
  });

  const toggleOperation = (op: string) => {
    setForm((f) => ({
      ...f,
      allowedOperations: f.allowedOperations.includes(op)
        ? f.allowedOperations.filter((o) => o !== op)
        : [...f.allowedOperations, op],
    }));
  };

  const togglePage = (key: string) => {
    setForm((f) => ({
      ...f,
      allowedPages: f.allowedPages.includes(key)
        ? f.allowedPages.filter((p) => p !== key)
        : [...f.allowedPages, key],
    }));
  };

  const toggleAllPages = () => {
    const allKeys = OPERATOR_PAGES.map((p) => p.key);
    const allSelected = allKeys.every((k) => form.allowedPages.includes(k));
    setForm((f) => ({ ...f, allowedPages: allSelected ? [] : allKeys }));
  };

  const allPagesSelected = OPERATOR_PAGES.every((p) => form.allowedPages.includes(p.key));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.fullName || (!editingUser && !form.password)) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (form.allowedOperations.length === 0) {
      toast({ title: "Selecione ao menos uma operação", variant: "destructive" });
      return;
    }
    if (editingUser && form.password && form.password.length < 6) {
      toast({ title: "A nova senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ id: editingUser?.id ?? null, values: form });
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEditDialog = (operator: OperatorUser) => {
    setEditingUser(operator);
    setForm({
      username: operator.username,
      fullName: operator.fullName,
      password: "",
      allowedOperations: operator.allowedOperations ?? [],
      allowedPages: operator.allowedPages ?? [],
      canManageMotoristas: operator.canManageMotoristas === true,
    });
    setOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários Operadores</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as contas de acesso dos operadores — operações e módulos permitidos.
          </p>
        </div>

        <Dialog open={open} onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setEditingUser(null);
            setForm(emptyForm);
          }
        }}>
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Novo Operador
          </Button>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar operador" : "Criar conta de operador"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="op-username">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="op-username"
                  placeholder="ex: operador01"
                  disabled={Boolean(editingUser)}
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))
                  }
                />
                <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e _</p>
              </div>

              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="op-fullName">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="op-fullName"
                  placeholder="ex: João da Silva"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="op-password">
                  Senha <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="op-password"
                  type="password"
                  placeholder={editingUser ? "deixe em branco para manter a atual" : "mínimo 6 caracteres"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>

              {/* Operations */}
              <div className="space-y-2">
                <Label>
                  Operações permitidas <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  {OPERATION_OPTIONS.map((op) => (
                    <label
                      key={op}
                      className="flex items-center gap-2 cursor-pointer select-none rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={form.allowedOperations.includes(op)}
                        onCheckedChange={() => toggleOperation(op)}
                      />
                      <span className="text-sm font-medium">{op}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pages */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Módulos permitidos</Label>
                  <button
                    type="button"
                    onClick={toggleAllPages}
                    className="text-xs text-primary hover:underline"
                  >
                    {allPagesSelected ? "Desmarcar todos" : "Selecionar todos"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Deixe em branco para liberar acesso a todos os módulos.
                </p>
                <div className="rounded-md border divide-y">
                  {PAGE_GROUPS.map(({ group, pages }) => (
                    <div key={group} className="p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                      <PageCheckboxGroup pages={pages} selected={form.allowedPages} onToggle={togglePage} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.allowedPages.length === 0
                    ? "Sem restrição de módulos (acesso total)"
                    : `${form.allowedPages.length} módulo(s) selecionado(s)`}
                </p>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={form.canManageMotoristas}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, canManageMotoristas: checked === true }))
                    }
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">Pode cadastrar motoristas</span>
                    <span className="block text-xs text-muted-foreground">
                      Permite criar, editar e excluir motoristas na área própria de motoristas.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : editingUser ? "Salvar alterações" : "Criar operador"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum operador cadastrado ainda.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Clique em "Novo Operador" para criar o primeiro acesso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isExpanded = expandedUser === u.id;
            return (
              <Card key={u.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Operation badges */}
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {(u.allowedOperations ?? []).length === 0 ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Sem operações
                          </Badge>
                        ) : (
                          (u.allowedOperations ?? []).map((op) => (
                            <Badge
                              key={op}
                              variant="secondary"
                              className={`text-xs font-bold ${
                                op === "LOGGI"
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-orange-100 text-orange-700 border-orange-200"
                              }`}
                            >
                              {op}
                            </Badge>
                          ))
                        )}
                      </div>

                       {u.canManageMotoristas && (
                         <Badge variant="outline" className="text-xs border-cyan-300 text-cyan-700">
                           Motoristas
                         </Badge>
                       )}

                       {/* Expand/collapse modules */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => openEditDialog(u)}
                        title="Editar operador e permissões"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar operador e permissões</span>
                      </Button>
                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                        title="Ver módulos"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 flex-shrink-0"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover operador?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O acesso de <strong>@{u.username}</strong> será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(u.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Expanded modules view */}
                      {isExpanded && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Módulos permitidos
                      </p>
                      {(u.allowedPages ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Acesso total (sem restrição de módulos)</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(u.allowedPages ?? []).map((key) => {
                            const page = OPERATOR_PAGES.find((p) => p.key === key);
                            return (
                              <Badge key={key} variant="outline" className="text-xs">
                                {page?.label ?? key}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
