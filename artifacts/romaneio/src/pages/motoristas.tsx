import { useUser } from "@clerk/react";
import { useOperatorAuth } from "@/contexts/operator-auth-context";
import { MotoristasTab } from "@/pages/admin";

export default function Motoristas() {
  const { user } = useUser();
  const { user: operatorUser } = useOperatorAuth();
  const clerkRole = user?.publicMetadata?.role as string | undefined;
  const isClerkAdmin = clerkRole === "admin" || clerkRole === "operator";
  const canManageMotoristas = isClerkAdmin || operatorUser?.canManageMotoristas === true;

  if (!canManageMotoristas) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito ao cadastro de motoristas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cadastro de Motoristas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cadastre e mantenha atualizada a lista de motoristas utilizada nas operações.
        </p>
      </div>
      <MotoristasTab />
    </div>
  );
}