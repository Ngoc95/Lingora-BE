import { Router } from "express";
import authRouter from "./auth.route";
import userRouter from "./user.route";
import userProgressRouter from "./userProgress.route";
import categoryRouter from "./category.route";
import topicRouter from "./topic.route";
import wordRouter from "./word.route";
import adaptiveTestRouter from "./adaptiveTest.route";
import postRouter from "./post.route";
import commentRouter from "./comment.route";
import likeRouter from "./like.route";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/topics", topicRouter);
router.use("/words", wordRouter);
router.use("/progress", userProgressRouter);
router.use("/adaptive-test", adaptiveTestRouter);
router.use("/posts", postRouter);
router.use("/comments", commentRouter);
router.use("/likes", likeRouter);

export default router;