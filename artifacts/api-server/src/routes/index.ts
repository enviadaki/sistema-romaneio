import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import scansRouter from "./scans";
import romaneioRouter from "./romaneio";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(scansRouter);
router.use(romaneioRouter);
router.use(statsRouter);

export default router;
