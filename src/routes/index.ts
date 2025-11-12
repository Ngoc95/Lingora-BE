import { Router } from "express";
import authRouter from "./auth.route";
import userRouter from "./user.route";
import userProgressRouter from "./userProgress.route";
import categoryRouter from "./category.route";
import topicRouter from "./topic.route";
import wordRouter from "./word.route";
import adaptiveTestRouter from "./adaptiveTest.route";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/topics", topicRouter);
router.use("/words", wordRouter);
router.use("/progress", userProgressRouter);
router.use("/adaptive-test", adaptiveTestRouter);

export default router;