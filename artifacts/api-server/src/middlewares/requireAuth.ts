import { getAuth, createClerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// In-memory cache: userId -> { name, expiresAt }
const nameCache = new Map<string, { name: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveUserName(userId: string): Promise<string | null> {
  const cached = nameCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.name;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const parts = [user.firstName, user.lastName].filter(Boolean);
    const name = parts.length > 0 ? parts.join(" ") : (user.emailAddresses[0]?.emailAddress ?? null);
    nameCache.set(userId, { name, expiresAt: Date.now() + CACHE_TTL_MS });
    return name;
  } catch {
    return null;
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

  // Try JWT claim first (fast path), fall back to Clerk API
  const claimName = (auth?.sessionClaims?.["fullName"] as string | undefined) ?? null;

  if (claimName) {
    (req as any).userFullName = claimName;
    next();
    return;
  }

  // Async path: fetch from Clerk API
  resolveUserName(userId).then((name) => {
    (req as any).userFullName = name;
    next();
  }).catch(() => {
    (req as any).userFullName = null;
    next();
  });
}
