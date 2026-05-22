import { Router } from "express";
import { getAuth, createClerkClient } from "@clerk/express";
import { db, motoristaUsersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function requireAdminClerk(req: any, res: any, next: any): Promise<void> {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }
  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const role = (user.publicMetadata as Record<string, unknown>)?.role as string | undefined;
    if (role !== "admin" && role !== "operator") {
      res.status(403).json({ error: "Acesso negado. Somente administradores." });
      return;
    }
    next();
  } catch {
    res.status(403).json({ error: "Acesso negado." });
  }
}

router.get("/motorista/identifier", async (req, res): Promise<void> => {
  const { username } = req.query;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "username é obrigatório" });
    return;
  }
  try {
    const [user] = await db
      .select()
      .from(motoristaUsersTable)
      .where(eq(motoristaUsersTable.username, username.trim().toLowerCase()));

    if (!user || !user.isActive) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({ identifier: user.clerkEmail });
  } catch (err) {
    req.log?.error({ err }, "motorista/identifier error");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/admin/motorista-users", requireAdminClerk, async (req, res): Promise<void> => {
  try {
    const users = await db
      .select({
        id: motoristaUsersTable.id,
        username: motoristaUsersTable.username,
        fullName: motoristaUsersTable.fullName,
        allowedRoutes: motoristaUsersTable.allowedRoutes,
        isActive: motoristaUsersTable.isActive,
        createdAt: motoristaUsersTable.createdAt,
      })
      .from(motoristaUsersTable)
      .orderBy(desc(motoristaUsersTable.createdAt));
    res.json(users);
  } catch (err) {
    req.log?.error({ err }, "admin/motorista-users GET error");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/admin/motorista-users", requireAdminClerk, async (req, res): Promise<void> => {
  const { username, fullName, password, allowedRoutes } = req.body as {
    username: unknown;
    fullName: unknown;
    password: unknown;
    allowedRoutes: unknown;
  };

  if (typeof username !== "string" || username.length < 3 || username.length > 32 || !/^[a-z0-9_]+$/.test(username)) {
    res.status(400).json({ error: "username inválido (3-32 chars, apenas letras minúsculas, números e _)" });
    return;
  }
  if (typeof fullName !== "string" || fullName.trim().length < 2) {
    res.status(400).json({ error: "Nome completo é obrigatório" });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
    return;
  }
  const routes: string[] = Array.isArray(allowedRoutes) ? (allowedRoutes as string[]).filter((r) => typeof r === "string") : [];
  const clerkEmail = `motorista-${username}@sistema.com`;

  try {
    const existing = await db
      .select({ id: motoristaUsersTable.id })
      .from(motoristaUsersTable)
      .where(eq(motoristaUsersTable.username, username));
    if (existing.length > 0) {
      res.status(409).json({ error: `Username '${username}' já está em uso` });
      return;
    }

    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [clerkEmail],
      username,
      password,
      skipPasswordChecks: true,
      firstName,
      lastName,
      publicMetadata: {
        role: "motorista",
        allowedRoutes: routes,
      },
    });

    await db.insert(motoristaUsersTable).values({
      username,
      clerkUserId: clerkUser.id,
      clerkEmail,
      fullName,
      allowedRoutes: routes,
      isActive: true,
    });

    res.status(201).json({ id: clerkUser.id, username, fullName });
  } catch (err: any) {
    req.log?.error({ err }, "admin/motorista-users POST error");
    const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? "Erro ao criar usuário";
    res.status(500).json({ error: msg });
  }
});

router.delete("/admin/motorista-users/:id", requireAdminClerk, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    const [user] = await db
      .select()
      .from(motoristaUsersTable)
      .where(eq(motoristaUsersTable.id, id));
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    await clerkClient.users.deleteUser(user.clerkUserId);
    await db.delete(motoristaUsersTable).where(eq(motoristaUsersTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    req.log?.error({ err }, "admin/motorista-users DELETE error");
    res.status(500).json({ error: err?.message ?? "Erro ao remover usuário" });
  }
});

export default router;
