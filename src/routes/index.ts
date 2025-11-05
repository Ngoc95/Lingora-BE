import { Router } from "express";
import authRouter from "./auth.route";
import userRouter from "./user.route";
import userProgressRouter from "./userProgress.route";
import categoryRouter from "./category.route";
import topicRouter from "./topic.route";
import wordRouter from "./word.route";

const router = Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/category", categoryRouter);
router.use("/topic", topicRouter);
router.use("/word", wordRouter);
router.use("/progress", userProgressRouter);

export default router;