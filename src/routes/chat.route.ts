import { Router } from "express";
import { chatController } from "../controllers/chat.controller";
import {
  accessTokenValidation,
  optionalAccessToken,
} from "../middlewares/auth.middlewares";
import { sendChatMessageValidation } from "../middlewares/chat/sendChatMessage.middlewares";
import { wrapRequestHandler } from "../utils/handler";

const chatRouter = Router();

chatRouter.post(
  "/",
  optionalAccessToken,
  sendChatMessageValidation,
  wrapRequestHandler(chatController.sendMessage)
);

chatRouter.get(
  "/sessions",
  accessTokenValidation,
  wrapRequestHandler(chatController.listSessions)
);

chatRouter.get(
  "/sessions/:sessionId/messages",
  optionalAccessToken,
  wrapRequestHandler(chatController.getSessionMessages)
);

chatRouter.delete(
  "/sessions/:sessionId",
  accessTokenValidation,
  wrapRequestHandler(chatController.deleteSession)
);

export default chatRouter;
