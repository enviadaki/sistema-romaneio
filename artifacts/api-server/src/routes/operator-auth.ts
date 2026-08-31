import { Router } from "express";
import { getAuth, createClerkClient } from "@clerk/express";
import { db, operatorUsersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const VALID_OPERATIONS = ["LOGGI", "AMAZON"] as const;
const VALID_PAGES = [
  "dashboard",
  "cadastro",
  "pre-sorter",
  "consulta",
  "entrega",
  "historico",
  "devolucoes",
  "romaneio",
  "romaneio-motorista",
  "financeiro",
  "qr-autoplay",
];

function sanitizePermissions(allowedOperations: unknown, allowedPages: unknown) {
  return {
    allowedOperations: Array.isArray(allowedOperations)
      ? (allowedOperations as unknown[]).filter(
          (operation): operation is (typeof VALID_OPERATIONS)[number] =>
            VALID_OPERATIONS.includes(operation as (typeof VALID_OPERATIONS)[number]),
        )
      : [],
    allowedPages: Array.isArray(allowedPages)
      ? (allowedPages as unknown[]).filter(
          (page): page is string => typeof page === "string" && VALID_PAGES.includes(page),
        )
      : [],
  };
}

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

// POST /api/operator/login — public
router.post("/operator/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: unknown; password?: unknown };
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "username e password são obrigatórios" });
    return;
  }
  try {
    const [user] = await db
      .select()
      .from(operatorUsersTable)
      .where(eq(operatorUsersTable.username, username.trim().toLowerCase()));

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Usuário ou senha inválidos" });
      return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ error: "Conta sem senha configurada. Contate o administrador." });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Usuário ou senha inválidos" });
      return;
    }
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      res.status(500).json({ error: "Configuração de segurança ausente" });
      return;
    }
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        allowedOperations: user.allowedOperations,
        allowedPages: user.allowedPages,
        role: "operator",
      },
      secret,
      { expiresIn: "24h" }
    );
    res.json({ token, username: user.username, fullName: user.fullName, allowedOperations: user.allowedOperations, allowedPages: user.allowedPages });
  } catch (err) {
    req.log?.error({ err }, "operator/login error");
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/admin/operator-users — admin only
router.get("/admin/operator-users", requireAdminClerk, async (req, res): Promise<void> => {
  try {
    const users = await db
      .select({
        id: operatorUsersTable.id,
        username: operatorUsersTable.username,
        fullName: operatorUsersTable.fullName,
        allowedOperations: operatorUsersTable.allowedOperations,
        allowedPages: operatorUsersTable.allowedPages,
        isActive: operatorUsersTable.isActive,
        createdAt: operatorUsersTable.createdAt,
      })
      .from(operatorUsersTable)
      .orderBy(desc(operatorUsersTable.createdAt));
    res.json(users);
  } catch (err) {
    req.log?.error({ err }, "admin/operator-users GET error");
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/admin/operator-users — admin only
router.post("/admin/operator-users", requireAdminClerk, async (req, res): Promise<void> => {
  const { username, fullName, password, allowedOperations, allowedPages } = req.body as {
    username: unknown; fullName: unknown; password: unknown; allowedOperations: unknown; allowedPages: unknown;
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
  const { allowedOperations: operations, allowedPages: pages } = sanitizePermissions(
    allowedOperations,
    allowedPages,
  );

  try {
    const existing = await db.select({ id: operatorUsersTable.id })
      .from(operatorUsersTable)
      .where(eq(operatorUsersTable.username, username));
    if (existing.length > 0) {
      res.status(409).json({ error: `Username '${username}' já está em uso` });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(operatorUsersTable).values({
      username,
      passwordHash,
      fullName,
      allowedOperations: operations,
      allowedPages: pages,
      isActive: true,
    });
    res.status(201).json({ username, fullName, allowedOperations: operations, allowedPages: pages });
  } catch (err: any) {
    req.log?.error({ err }, "admin/operator-users POST error");
    res.status(500).json({ error: err?.message ?? "Erro ao criar usuário" });
  }
});

// PUT /api/admin/operator-users/:id — admin only
router.put("/admin/operator-users/:id", requireAdminClerk, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { fullName, password, allowedOperations, allowedPages } = req.body as {
    fullName?: unknown;
    password?: unknown;
    allowedOperations?: unknown;
    allowedPages?: unknown;
  };

  if (typeof fullName !== "string" || fullName.trim().length < 2) {
    res.status(400).json({ error: "Nome completo é obrigatório" });
    return;
  }
  if (password !== undefined && (typeof password !== "string" || (password.length > 0 && password.length < 6))) {
    res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });
    return;
  }
  if (!Array.isArray(allowedOperations) || !Array.isArray(allowedPages)) {
    res.status(400).json({ error: "Selecione as permissões do usuário" });
    return;
  }

  const [existing] = await db
    .select()
    .from(operatorUsersTable)
    .where(eq(operatorUsersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const permissions = sanitizePermissions(allowedOperations, allowedPages);
  if (permissions.allowedOperations.length === 0) {
    res.status(400).json({ error: "Selecione ao menos uma operação" });
    return;
  }

  try {
    const updates: {
      fullName: string;
      allowedOperations: string[];
      allowedPages: string[];
      passwordHash?: string;
    } = {
      fullName: fullName.trim(),
      allowedOperations: permissions.allowedOperations,
      allowedPages: permissions.allowedPages,
    };

    if (typeof password === "string" && password.length > 0) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    const [updated] = await db
      .update(operatorUsersTable)
      .set(updates)
      .where(eq(operatorUsersTable.id, id))
      .returning({
        id: operatorUsersTable.id,
        username: operatorUsersTable.username,
        fullName: operatorUsersTable.fullName,
        allowedOperations: operatorUsersTable.allowedOperations,
        allowedPages: operatorUsersTable.allowedPages,
        isActive: operatorUsersTable.isActive,
        createdAt: operatorUsersTable.createdAt,
      });

    res.json(updated);
  } catch (err: any) {
    req.log?.error({ err }, "admin/operator-users PUT error");
    res.status(500).json({ error: err?.message ?? "Erro ao atualizar usuário" });
  }
});

// DELETE /api/admin/operator-users/:id — admin only
router.delete("/admin/operator-users/:id", requireAdminClerk, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    const [user] = await db.select().from(operatorUsersTable).where(eq(operatorUsersTable.id, id));
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    await db.delete(operatorUsersTable).where(eq(operatorUsersTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    req.log?.error({ err }, "admin/operator-users DELETE error");
    res.status(500).json({ error: err?.message ?? "Erro ao remover usuário" });
  }
});

export default router;
