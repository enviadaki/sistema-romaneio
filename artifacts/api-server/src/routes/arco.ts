import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  db,
  packagesTable,
  routeCitiesTable,
  citiesTable,
  routesTable,
} from "@workspace/db";
import {
  ArcoLookupQueryParams,
  ArcoLookupResponse,
  ArcoPingResponse,
  GetArcoConfigResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

function getQueryString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function keysMatch(provided: string, configured: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(configured);
  if (providedBuffer.length !== configuredBuffer.length) return false;
  return timingSafeEqual(providedBuffer, configuredBuffer);
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "•".repeat(apiKey.length);
  return `${apiKey.slice(0, 4)}${"•".repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}

export function requireArcoKey(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.ARCO_API_KEY?.trim();
  if (!configuredKey) {
    res.status(503).json({ error: "Integração Arco não configurada." });
    return;
  }

  const headerKey = req.get("X-API-Key")?.trim();
  const queryKey = getQueryString(req.query.apiKey);
  const isValid = [headerKey, queryKey]
    .filter((key): key is string => Boolean(key))
    .some((key) => keysMatch(key, configuredKey));

  if (!isValid) {
    res.status(401).json({ error: "Chave da API Arco inválida ou ausente." });
    return;
  }

  next();
}

router.get("/arco/ping", (_req, res): void => {
  res.json(ArcoPingResponse.parse({ ok: true, service: "romaneios" }));
});

router.get("/arco/lookup", requireArcoKey, async (req, res): Promise<void> => {
  const parsed = ArcoLookupQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const code = parsed.data.code;

  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(
      and(
        eq(packagesTable.trackingNumber, code),
        eq(packagesTable.operation, "LOGGI"),
      ),
    )
    .limit(1);

  if (!pkg) {
    res.json(ArcoLookupResponse.parse({
      found: false,
      trackingNumber: code,
      city: null,
      route: null,
      operation: null,
    }));
    return;
  }

  const [route] = await db
    .select({ name: routesTable.name })
    .from(routeCitiesTable)
    .innerJoin(citiesTable, eq(routeCitiesTable.cityId, citiesTable.id))
    .innerJoin(routesTable, eq(routeCitiesTable.routeId, routesTable.id))
    .where(sql`lower(${citiesTable.name}) = lower(${pkg.city})`)
    .orderBy(asc(routesTable.name))
    .limit(1);

  res.json(ArcoLookupResponse.parse({
    found: true,
    trackingNumber: pkg.trackingNumber,
    city: pkg.city,
    route: route?.name ?? null,
    operation: pkg.operation,
  }));
});

router.get("/arco/config", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const apiKey = process.env.ARCO_API_KEY?.trim() ?? "";
  res.json(GetArcoConfigResponse.parse({
    configured: Boolean(apiKey),
    maskedApiKey: apiKey ? maskApiKey(apiKey) : null,
  }));
});

export default router;