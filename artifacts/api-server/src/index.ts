import app from "./app";
import { logger } from "./lib/logger";
import { seedReferenceData } from "./lib/seed-reference-data";
import { sweepStaleEnvios } from "./modules/arco-envios/claim";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  seedReferenceData();

  // Varredura periódica dos envios ARCO "esquecidos" — ver sweepStaleEnvios.
  const ARCO_SWEEP_INTERVAL_MS = 60_000;
  setInterval(() => {
    sweepStaleEnvios().catch((err: unknown) => {
      logger.error({ err }, "Falha na varredura de envios ARCO interrompidos");
    });
  }, ARCO_SWEEP_INTERVAL_MS);
});
