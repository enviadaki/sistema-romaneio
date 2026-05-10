import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
    return;
  }
  (req as any).userId = userId;
  (req as any).userFullName =
    (auth?.sessionClaims?.["fullName"] as string | undefined) ?? null;
  next();
}
