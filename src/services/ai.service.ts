import axios, { AxiosInstance } from "axios";
import { env } from "~/config/env";
import { BadRequestError } from "~/core/error.response";
import { ChatMessageSender } from "~/enums/chatMessageSender.enum";

class AiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.AI_SERVICE_URL,
      timeout: env.AI_SERVICE_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async sendChat({
    question,
    sessionId,
    history = [],
  }: {
    question: string;
    sessionId?: string;
    history?: Array<{ sender: ChatMessageSender; content: string }>;
  }) {
    try {
      const payload: Record<string, unknown> = { question };

      if (sessionId) {
        payload.session_id = sessionId;
      }

      if (history && history.length > 0) {
        payload.history = history.map((message) => ({
          sender: message.sender,
          content: message.content,
        }));
      }

      const { data } = await this.client.post("/chat", payload);

      if (!data || typeof data.answer !== "string") {
        throw new Error("AI service did not return a valid answer");
      }

      return data.answer as string;
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "AI service unavailable";

      throw new BadRequestError({
        message: `AI service error: ${message}`,
      });
    }
  }

  async generateTitle(question: string) {
    try {
      const { data } = await this.client.post("/generate-title", { question });

      const title = typeof data?.title === "string" ? data.title.trim() : "";
      if (!title) {
        throw new Error("AI service did not return a valid title");
      }
      return title;
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "AI title service unavailable";

      throw new BadRequestError({
        message: `AI service error: ${message}`,
      });
    }
  }
}

export const aiService = new AiService();
