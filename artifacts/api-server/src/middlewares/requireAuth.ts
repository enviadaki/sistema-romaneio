import { getAuth, createClerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Roles permitted to access the system. Override via ALLOWED_ROLES env var
// (comma-separated, e.g. "operator,admin,motorista"). Defaults to "operator,admin,motorista".
const ALLOWED_ROLES = new Set(
  (process.env.ALLOWED_ROLES ?? "operator,admin,motorista")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
);

// Emails that automatically receive admin role (comma-separated).
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

// In-memory cache: userId -> { name, role, authorized, expiresAt }
const userCache = new Map<string, { name: string | null; role: string | undefined; authorized: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveUser(userId: string): Promise<{ name: string | null; authorized: boolean; hasRole: boolean }> {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    const hasRole = !!cached.role;
    return { name: cached.name, authorized: cached.authorized, hasRole };
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

    let authorized = ALLOWED_ROLES.has(role ?? "");

    if (!authorized && ADMIN_EMAILS.size > 0) {
      const primaryEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
      if (primaryEmail && ADMIN_EMAILS.has(primaryEmail)) {
        authorized = true;
        try {
          await clerkClient.users.updateUser(userId, {
            publicMetadata: { ...((user.publicMetadata as object) ?? {}), role: "admin" },
          });
          userCache.delete(userId);
        } catch {
          // Non-fatal
        }
      }
    }

    userCache.set(userId, { name, role: role ?? undefined, authorized, expiresAt: Date.now() + CACHE_TTL_MS });
    return { name, authorized, hasRole: !!role };
  } catch {
    return { name: null, authorized: false, hasRole: false };
  }
}

function tryCustomJwt(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    const payload = jwt.verify(token, secret) as Record<string, unknown>;
    const role = payload.role as string | undefined;
    if (role !== "motorista" && role !== "operator") return false;
    (req as any).userId = `${role}_${payload.id}`;
    (req as any).userFullName = payload.fullName ?? payload.username;
    (req as any).customRole = role;
    return true;
  } catch {
    return false;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Custom JWT takes priority — if a valid Bearer token is present, use it
  // regardless of any Clerk session cookie that may also be present.
  if (tryCustomJwt(req)) {
    next();
    return;
  }

  // Fall back to Clerk auth (session cookie or Clerk-issued Bearer token)
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (userId) {
    (req as any).userId = userId;
    resolveUser(userId)
      .then(({ name, authorized, hasRole }) => {
        if (!hasRole) {
          // Clerk user exists but has no role assigned — treat as unauthenticated
          // so a custom JWT in a parallel request can still be used.
          res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
          return;
        }
        if (!authorized) {
          res.status(403).json({ error: "Acesso negado. Conta não autorizada para este sistema." });
          return;
        }
        (req as any).userFullName = name;
        next();
      })
      .catch(() => {
        res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
      });
    return;
  }

  res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
}
