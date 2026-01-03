import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { SuccessResponse } from "~/core/success.response";
import { SendChatMessageBodyReq } from "~/dtos/req/chat/sendChatMessageBody.req";
import { ChatMessage } from "~/entities/chatMessage.entity";
import { ChatSession } from "~/entities/chatSession.entity";
import { chatService } from "~/services/chat.service";
import { User } from "~/entities/user.entity";

class ChatController {
  private serializeMessage(message: ChatMessage) {
    return {
      id: message.id,
      content: message.content,
      sender: message.sender,
      createdAt: message.createdAt,
    };
  }

  private serializeSession(session: ChatSession) {
    return {
      id: session.id,
      title: session.title,
      userId: session.user ? session.user.id : null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  sendMessage = async (
    req: Request<ParamsDictionary, any, SendChatMessageBodyReq>,
    res: Response
  ) => {
    const user = req.user as User | undefined;
    const result = await chatService.sendMessage(req.body, user);

    return new SuccessResponse({
      message: "Chat response generated",
      metaData: {
        session: this.serializeSession(result.session),
        answer: result.answer,
        messages: [result.userMessage, result.aiMessage].map((message) =>
          this.serializeMessage(message)
        ),
      },
    }).send(res);
  };

  listSessions = async (req: Request, res: Response) => {
    const user = req.user as User | undefined;
    const sessions = await chatService.listSessions(user);

    return new SuccessResponse({
      message: "Get chat sessions successfully",
      metaData: {
        sessions: sessions.map((session) => this.serializeSession(session)),
      },
    }).send(res);
  };

  getSessionMessages = async (
    req: Request<{ sessionId: string }, any, any>,
    res: Response
  ) => {
    const user = req.user as User | undefined;
    const { sessionId } = req.params;
    const result = await chatService.getSessionMessages(sessionId, user);

    return new SuccessResponse({
      message: "Get chat messages successfully",
      metaData: {
        session: this.serializeSession(result.session),
        messages: result.messages.map((message) =>
          this.serializeMessage(message)
        ),
      },
    }).send(res);
  };

  deleteSession = async (req: Request<{ sessionId: string }>, res: Response) => {
    const user = req.user as User | undefined;
    const { sessionId } = req.params;
    await chatService.deleteSession(sessionId, user);

    return new SuccessResponse({
      message: "Chat session deleted",
      metaData: { sessionId },
    }).send(res);
  };
}

export const chatController = new ChatController();
