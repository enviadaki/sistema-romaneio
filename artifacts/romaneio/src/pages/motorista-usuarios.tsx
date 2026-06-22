import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Plus, Trash2, User, Route, Shield } from "lucide-react";
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
  DialogTrigger,
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

interface RouteRow { id: number; name: string }

interface MotoristaUser {
  id: number;
  username: string;
  fullName: string;
  allowedRoutes: string[];
  isActive: boolean;
  createdAt: string;
}

interface CreateForm {
  username: string;
  fullName: string;
  password: string;
  allowedRoutes: string[];
}

const emptyForm: CreateForm = {
  username: "",
  fullName: "",
  password: "",
  allowedRoutes: [],
};

export default function MotoristaUsuarios() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [creating, setCreating] = useState(false);

  const role = user?.publicMetadata?.role as string | undefined;
  const isAdmin = role === "admin" || role === "operator";

  const { data: users = [], isLoading } = useQuery<MotoristaUser[]>({
    queryKey: ["admin-motorista-users"],
    queryFn: () => customFetch<MotoristaUser[]>("/api/admin/motorista-users"),
    enabled: isAdmin,
  });

  const { data: availableRoutes = [] } = useQuery<RouteRow[]>({
    queryKey: ["admin-routes"],
    queryFn: () => customFetch<RouteRow[]>("/api/admin/routes"),
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/admin/motorista-users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-motorista-users"] });
      toast({ title: "Motorista removido com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover", description: String(err?.message ?? err), variant: "destructive" });
    },
  });

  const toggleRoute = (route: string) => {
    setForm((f) => ({
      ...f,
      allowedRoutes: f.allowedRoutes.includes(route)
        ? f.allowedRoutes.filter((r) => r !== route)
        : [...f.allowedRoutes, route],
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.fullName || !form.password) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await customFetch("/api/admin/motorista-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-motorista-users"] });
      toast({ title: `Motorista ${form.username} criado com sucesso` });
      setForm(emptyForm);
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Erro ao criar motorista",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
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
          <h1 className="text-2xl font-bold tracking-tight">Usuários Motoristas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as contas de acesso dos motoristas. Login sem e-mail — só usuário e senha.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar conta de motorista</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="username">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  placeholder="ex: joaosilva"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))
                  }
                />
                <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e _</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fullName">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="ex: João Silva"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Senha <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="mínimo 6 caracteres"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Rotas liberadas</Label>
                <div className="border rounded-md p-3 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableRoutes.length === 0 ? (
                    <p className="col-span-2 text-xs text-muted-foreground italic">
                      Nenhuma rota cadastrada. Cadastre rotas em Administração → Rotas.
                    </p>
                  ) : (
                    availableRoutes.map((r) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`route-${r.id}`}
                          checked={form.allowedRoutes.includes(r.name)}
                          onCheckedChange={() => toggleRoute(r.name)}
                        />
                        <label
                          htmlFor={`route-${r.id}`}
                          className="text-sm cursor-pointer leading-none"
                        >
                          {r.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.allowedRoutes.length === 0
                    ? "Sem restrição — verá todas as rotas"
                    : `${form.allowedRoutes.length} rota(s) selecionada(s)`}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={creating} className="flex-1">
                  {creating ? "Criando..." : "Criar motorista"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-muted-foreground">Nenhum motorista cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Novo Motorista" para criar o primeiro acesso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {users.map((u) => (
            <Card key={u.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{u.fullName}</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                          {u.username}
                        </code>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Shield className="h-3 w-3" />
                          motorista
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {u.allowedRoutes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Todas as rotas</span>
                        ) : (
                          u.allowedRoutes.map((r) => (
                            <Badge key={r} variant="outline" className="text-xs gap-1 py-0">
                              <Route className="h-2.5 w-2.5" />
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover motorista?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O usuário <strong>{u.username}</strong> ({u.fullName}) perderá o acesso imediatamente. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(u.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
