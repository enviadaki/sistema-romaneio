import { getAuth, createClerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Roles permitted to access the system. Override via ALLOWED_ROLES env var
// (comma-separated, e.g. "operator,admin"). Defaults to "operator,admin".
const ALLOWED_ROLES = new Set(
  (process.env.ALLOWED_ROLES ?? "operator,admin")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
);

// In-memory cache: userId -> { name, authorized, expiresAt }
const userCache = new Map<string, { name: string | null; authorized: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveUser(userId: string): Promise<{ name: string | null; authorized: boolean }> {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { name: cached.name, authorized: cached.authorized };
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const parts = [user.firstName, user.lastName].filter(Boolean);
    const name =
      parts.length > 0
        ? parts.join(" ")
        : (user.emailAddresses[0]?.emailAddress ?? null);
    const role = (user.publicMetadata as Record<string, unknown>)?.role as
      | string
      | undefined;
    const authorized = ALLOWED_ROLES.has(role ?? "");
    userCache.set(userId, { name, authorized, expiresAt: Date.now() + CACHE_TTL_MS });
    return { name, authorized };
  } catch {
    return { name: null, authorized: false };
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
    return;
  }
  (req as any).userId = userId;

  resolveUser(userId)
    .then(({ name, authorized }) => {
      if (!authorized) {
        res
          .status(403)
          .json({ error: "Acesso negado. Conta não autorizada para este sistema." });
        return;
      }
      (req as any).userFullName = name;
      next();
    })
    .catch(() => {
      res
        .status(403)
        .json({ error: "Acesso negado. Conta não autorizada para este sistema." });
    });
}
