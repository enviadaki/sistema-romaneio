import { getAuth, createClerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const ADMIN_ROLES = new Set(["admin", "operator"]);

const roleCache = new Map<string, { role: string | undefined; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getClerkRole(userId: string): Promise<string | undefined> {
  const cached = roleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.role;
  try {
    const user = await clerkClient.users.getUser(userId);
    const role = (user.publicMetadata as Record<string, unknown>)?.role as string | undefined;
    roleCache.set(userId, { role, expiresAt: Date.now() + CACHE_TTL_MS });
    return role;
  } catch {
    return undefined;
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Custom JWT users (motoristas / operators) are never admins
  if ((req as any).customRole) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }

  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  const role = await getClerkRole(userId);
  if (!role || !ADMIN_ROLES.has(role)) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }

  next();
}
