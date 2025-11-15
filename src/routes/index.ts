import { Router } from "express";
import authRouter from "./auth.route";
import userRouter from "./user.route";
import userProgressRouter from "./userProgress.route";
import categoryRouter from "./category.route";
import topicRouter from "./topic.route";
import wordRouter from "./word.route";
import studySetRouter from "./studySet.route";
import vnpayReturnRouter from "./vnpayReturn.route";
import adminStudySetRouter from "./adminStudySet.route";
import notificationRouter from "./notification.route";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/topics", topicRouter);
router.use("/words", wordRouter);
router.use("/progress", userProgressRouter);
router.use("/studysets", studySetRouter);
router.use("/vnpay", vnpayReturnRouter);
router.use("/admin/studysets", adminStudySetRouter);
router.use("/notifications", notificationRouter);

export default router;