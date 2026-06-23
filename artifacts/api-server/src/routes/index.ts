import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import professionalsRouter from "./professionals";
import servicesRouter from "./services";
import availabilityRouter from "./availability";
import appointmentsRouter from "./appointments";
import clientsRouter from "./clients";
import subscriptionsRouter from "./subscriptions";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import bookingRouter from "./booking";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/professionals", professionalsRouter);
router.use("/services", servicesRouter);
router.use("/availability", availabilityRouter);
router.use("/appointments", appointmentsRouter);
router.use("/clients", clientsRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/admin", adminRouter);
router.use("/booking", bookingRouter);

export default router;
