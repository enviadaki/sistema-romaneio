import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import scansRouter from "./scans";
import romaneioRouter from "./romaneio";
import statsRouter from "./stats";
import deliveriesRouter from "./deliveries";
import cityContactsRouter from "./city-contacts";
import deliveryManifestsRouter from "./delivery-manifests";
import driverSettlementsRouter from "./driver-settlements";
import motoristasRouter from "./motoristas";
import motoristaAuthRouter from "./motorista-auth";
import operatorAuthRouter from "./operator-auth";
import adminCadastrosRouter from "./admin-cadastros";
import arcoRouter from "./arco";
import returnProtocolsRouter from "./return-protocols";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(scansRouter);
router.use(romaneioRouter);
router.use(statsRouter);
router.use(deliveriesRouter);
router.use(cityContactsRouter);
router.use(deliveryManifestsRouter);
router.use(driverSettlementsRouter);
router.use(motoristasRouter);
router.use(motoristaAuthRouter);
router.use(operatorAuthRouter);
router.use(adminCadastrosRouter);
router.use(returnProtocolsRouter);
router.use(arcoRouter);

export default router;
