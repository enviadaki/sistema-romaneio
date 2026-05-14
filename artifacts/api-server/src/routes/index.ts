import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import scansRouter from "./scans";
import romaneioRouter from "./romaneio";
import statsRouter from "./stats";
import deliveriesRouter from "./deliveries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(scansRouter);
router.use(romaneioRouter);
router.use(statsRouter);
router.use(deliveriesRouter);

export default router;
