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

  async gradeWriting(question: string, answer: string) {
    try {
      const { data } = await this.client.post("/score/writing", {
        question,
        answer,
      });
      return data;
    } catch (error) {
      console.error("AI Writing Grading Error:", error);
      return null;
    }
  }

  async gradeSpeaking(question: string, audioUrl: string) {
    try {
      const { data } = await this.client.post("/score/speaking", {
        question,
        audio_url: audioUrl,
      });
      return data;
    } catch (error) {
      console.error("AI Speaking Grading Error:", error);
      return null;
    }
  }

  async moderateContent(text: string): Promise<{
    is_safe: boolean;
    reason?: string;
    detected_word?: string;
    confidence_score?: number;
  } | null> {
    try {
      const { data } = await this.client.post("/moderate", { text });
      return data;
    } catch (error) {
      console.error("AI Moderation Error:", error);
      return null;
    }
  }
}

export const aiService = new AiService();
