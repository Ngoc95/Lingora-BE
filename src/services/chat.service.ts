import {
  BadRequestError,
  ForbiddenRequestError,
  NotFoundRequestError,
} from "../core/error.response";
import { SendChatMessageBodyReq } from "../dtos/req/chat/sendChatMessageBody.req";
import { ChatMessage } from "../entities/chatMessage.entity";
import { ChatSession } from "../entities/chatSession.entity";
import { User } from "../entities/user.entity";
import { ChatMessageSender } from "../enums/chatMessageSender.enum";
import { DatabaseService } from "./database.service";
import { aiService } from "./ai.service";

class ChatService {
  private db = DatabaseService.getInstance();

  private buildFallbackTitle(question: string) {
    const normalized = question.trim().replace(/\s+/g, " ");
    return normalized.length > 80
      ? `${normalized.slice(0, 77)}...`
      : normalized;
  }

  private async buildSessionTitle(question: string) {
    const fallback = this.buildFallbackTitle(question);
    try {
      const title = await aiService.generateTitle(question);
      return title || fallback;
    } catch (error) {
      console.warn("⚠️ Failed to generate AI chat title:", error);
      return fallback;
    }
  }

  private async getSessionHistoryPayload(sessionId: string, limit = 10) {
    const messageRepo = await this.db.getRepository(ChatMessage);
    const messages = await messageRepo.find({
      where: { session: { id: sessionId } },
      order: { createdAt: "DESC" },
      take: limit,
    });

    return messages
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((message) => ({
        sender: message.sender,
        content: message.content,
      }));
  }

  private async findSessionOrThrow(sessionId: string, user?: User | null) {
    const sessionRepo = await this.db.getRepository(ChatSession);
    const session = await sessionRepo.findOne({
      where: { id: sessionId },
      relations: ["user"],
    });

    if (!session) {
      throw new NotFoundRequestError("Chat session not found");
    }

    if (session.user && session.user.id !== user?.id) {
      throw new ForbiddenRequestError(
        "You are not allowed to access this chat session"
      );
    }

    return session;
  }

  async sendMessage(
    body: SendChatMessageBodyReq,
    user?: User | null
  ): Promise<{
    session: ChatSession;
    userMessage: ChatMessage;
    aiMessage: ChatMessage;
    answer: string;
  }> {
    const trimmedQuestion = body.question.trim();

    if (!trimmedQuestion) {
      throw new BadRequestError({ message: "Question cannot be empty" });
    }

    const baseSession = body.sessionId
      ? await this.findSessionOrThrow(body.sessionId, user)
      : (() => {
          const newSession = new ChatSession();
          newSession.user = user ?? null;
          return newSession;
        })();

    if (!baseSession.title) {
      baseSession.title = await this.buildSessionTitle(trimmedQuestion);
    }

    const existingSessionId = baseSession.id || body.sessionId;
    const sessionHistory = existingSessionId
      ? await this.getSessionHistoryPayload(existingSessionId)
      : [];

    const answer = await aiService.sendChat({
      question: trimmedQuestion,
      sessionId: existingSessionId,
      history: sessionHistory,
    });

    const result = await this.db.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(ChatSession);
      const messageRepo = manager.getRepository(ChatMessage);

      const persistedSession = await sessionRepo.save(baseSession);

      const userMessage = messageRepo.create({
        session: persistedSession,
        sender: ChatMessageSender.USER,
        content: trimmedQuestion,
      });

      const aiMessage = messageRepo.create({
        session: persistedSession,
        sender: ChatMessageSender.AI,
        content: answer,
      });

      await messageRepo.save([userMessage, aiMessage]);

      return { session: persistedSession, userMessage, aiMessage };
    });

    return { ...result, answer };
  }

  async listSessions(user?: User | null) {
    if (!user) return [];
    const sessionRepo = await this.db.getRepository(ChatSession);
    return sessionRepo.find({
      where: { user: { id: user.id } },
      order: { updatedAt: "DESC" },
    });
  }

  async getSessionMessages(sessionId: string, user?: User | null) {
    const session = await this.findSessionOrThrow(sessionId, user);
    const messageRepo = await this.db.getRepository(ChatMessage);
    const messages = await messageRepo.find({
      where: { session: { id: session.id } },
      order: { createdAt: "ASC" },
    });

    return { session, messages };
  }

  async deleteSession(sessionId: string, user?: User | null) {
    if (!user) {
      throw new ForbiddenRequestError(
        "Authentication required to delete chat session"
      );
    }

    const session = await this.findSessionOrThrow(sessionId, user);

    const sessionRepo = await this.db.getRepository(ChatSession);
    await sessionRepo.remove(session);
  }
}

export const chatService = new ChatService();
