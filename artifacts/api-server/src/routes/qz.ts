// Endpoints usados pelo lib/qz-print.ts do frontend pra imprimir sem o popup
// "Allow" aparecer a cada bipagem — ver modules/qz/signing.ts pro porquê. A
// chave privada nunca sai do servidor; essas rotas só devolvem o certificado
// público e assinaturas sob pedido, nunca a chave em si.
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getQzCertificate, signQzMessage } from "../modules/qz/signing";

const router: IRouter = Router();

// GET /qz/certificate — certificado público. 503 (não 404) quando o
// servidor ainda não tem o certificado configurado — sinaliza "recurso
// existe, mas não está pronto ainda", pro frontend simplesmente cair de
// volta no fluxo anônimo de hoje sem logar erro como se fosse rota inexistente.
router.get("/qz/certificate", requireAuth, (_req, res): void => {
  const cert = getQzCertificate();
  if (!cert) {
    res.status(503).type("text/plain").send("Certificado QZ Tray não configurado no servidor.");
    return;
  }
  res.type("text/plain").send(cert);
});

// GET /qz/sign?request=<string> — assina a string que o QZ Tray manda a
// cada pedido de impressão (ver qz.security.setSignaturePromise no
// frontend). Mesmo tratamento de 503 quando a chave ainda não está
// configurada.
router.get("/qz/sign", requireAuth, (req, res): void => {
  const toSign = (req.query.request as string | undefined) ?? "";
  const signature = signQzMessage(toSign);
  if (!signature) {
    res.status(503).type("text/plain").send("Assinatura QZ Tray não configurada no servidor.");
    return;
  }
  res.type("text/plain").send(signature);
});

export default router;
