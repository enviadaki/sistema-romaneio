import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { touchAgenteStatus } from "../modules/arco-envios/agente-status";

// Autenticação do agente externo (Python, na máquina do operador) que busca
// envios e bipa no site da Loggi — separada do Clerk, igual à existente
// requireArcoKey (arco.ts), mas via "Authorization: Bearer <AGENTE_TOKEN>"
// em vez de X-API-Key, pra não colidir com a integração Arco já existente.
function tokensMatch(provided: string, configured: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(configured);
  if (providedBuffer.length !== configuredBuffer.length) return false;
  return timingSafeEqual(providedBuffer, configuredBuffer);
}

export function requireAgenteToken(req: Request, res: Response, next: NextFunction): void {
  const configuredToken = process.env.AGENTE_TOKEN?.trim();
  if (!configuredToken) {
    res.status(503).json({ error: "Integração com o agente não configurada." });
    return;
  }

  const authHeader = req.get("Authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  if (!providedToken || !tokensMatch(providedToken, configuredToken)) {
    res.status(401).json({ error: "Token do agente inválido ou ausente." });
    return;
  }

  // Melhor esforço — nunca atrasa nem derruba a requisição real do agente.
  touchAgenteStatus();
  next();
}
