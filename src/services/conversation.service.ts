import { DatabaseService } from "./database.service";
import { aiService } from "./ai.service";
import { ConversationContext } from "~/entities/conversationContext.entity";
import { ConversationSession } from "~/entities/conversationSession.entity";
import { ConversationMessage, ChatSender } from "~/entities/conversationMessage.entity";
import { ConversationSuggestionTemplate } from "~/entities/conversationSuggestionTemplate.entity";
import { User } from "~/entities/user.entity";
import { ConversationStatus } from "~/enums/conversationStatus.enum";

export class ConversationService {
    private static instance: ConversationService;
    private db = DatabaseService.getInstance();

    private constructor() {}

    static getInstance(): ConversationService {
        if (!ConversationService.instance) {
            ConversationService.instance = new ConversationService();
        }
        return ConversationService.instance;
    }

    async getActiveContexts() {
        const repo = await this.db.getRepository(ConversationContext);
        return await repo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC' }
        });
    }

    async getContextTemplates(contextId: number) {
        const repo = await this.db.getRepository(ConversationSuggestionTemplate);
        return await repo.find({
            where: { context: { id: contextId } },
            order: { sortOrder: 'ASC' }
        });
    }

    async createSession(user: User, contextId: number) {
        const contextRepo = await this.db.getRepository(ConversationContext);
        const sessionRepo = await this.db.getRepository(ConversationSession);
        const messageRepo = await this.db.getRepository(ConversationMessage);

        const context = await contextRepo.findOne({ where: { id: contextId, isActive: true } });
        if (!context) {
            throw new Error(`Context ${contextId} not found or inactive`);
        }

        let session = sessionRepo.create({
            user,
            context,
            title: `Practice: ${context.name}`,
            currentPhase: 'opening',
            status: ConversationStatus.ACTIVE,
            totalMessages: 0,
            errorCount: 0
        });

        session = await sessionRepo.save(session);

        // Generate opening message from AI
        const aiOpeningResult = await aiService.startConversation({
            system_prompt: context.systemPrompt,
            context: context.description,
            difficulty: context.difficultyLevel
        });

        if (aiOpeningResult) {
            const aiMessage = messageRepo.create({
                session,
                sender: ChatSender.AI,
                content: aiOpeningResult.response,
                suggestions: aiOpeningResult.suggestions
            });
            await messageRepo.save(aiMessage);
            
            session.totalMessages += 1;
            await sessionRepo.save(session);
        }

        const sessionWithMessages = await sessionRepo.findOne({
            where: { id: session.id },
            relations: ['context', 'messages']
        });

        return sessionWithMessages!;
    }

    async sendMessage(user: User, sessionId: string, question: string) {
        const sessionRepo = await this.db.getRepository(ConversationSession);
        const messageRepo = await this.db.getRepository(ConversationMessage);

        const session = await sessionRepo.findOne({
            where: { id: sessionId, user: { id: user.id } },
            relations: ['context', 'messages']
        });

        if (!session) throw new Error("Session not found");
        if (session.status !== ConversationStatus.ACTIVE) throw new Error("Session is no longer active");

        const history = (session.messages || [])
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map(m => ({
                sender: m.sender.toString(),
                content: m.content
            }));

        const aiResult = await aiService.sendConversation({
            question,
            system_prompt: session.context.systemPrompt,
            context: session.context.description,
            difficulty: session.context.difficultyLevel,
            current_phase: session.currentPhase,
            history
        });

        if (!aiResult) {
            throw new Error("Failed to get response from AI Service");
        }

        // Save User Message
        const userMessage = messageRepo.create({
            session,
            sender: ChatSender.USER,
            content: question
        });
        await messageRepo.save(userMessage);

        // Save AI Message with corrections and suggestions
        const aiMessage = messageRepo.create({
            session,
            sender: ChatSender.AI,
            content: aiResult.response,
            corrections: aiResult.correction?.has_error ? aiResult.correction : null,
            suggestions: aiResult.suggestions
        });
        await messageRepo.save(aiMessage);

        // Update Session
        session.totalMessages += 2;
        if (aiResult.correction?.has_error) {
            session.errorCount += 1;
        }

        if (aiResult.next_phase && aiResult.next_phase !== session.currentPhase) {
            session.currentPhase = aiResult.next_phase;
        }

        // Auto end session if AI marks it as completed
        if (session.currentPhase === 'completed') {
            session.status = ConversationStatus.COMPLETED;
            session.endedAt = new Date();
            await sessionRepo.save(session);

            // Trigger async score calculation (do not await to respond fast)
            this.calculateSessionScores(session);
        } else {
            await sessionRepo.save(session);
        }

        return {
            session,
            messages: [userMessage, aiMessage],
            aiResult
        };
    }

    async endSession(user: User, sessionId: string) {
        const sessionRepo = await this.db.getRepository(ConversationSession);
        const session = await sessionRepo.findOne({
            where: { id: sessionId, user: { id: user.id } },
            relations: ['context']
        });

        if (!session) throw new Error("Session not found");
        if (session.status === ConversationStatus.COMPLETED) return session;

        session.status = ConversationStatus.COMPLETED;
        session.currentPhase = 'completed';
        session.endedAt = new Date();
        await sessionRepo.save(session);
        
        await this.calculateSessionScores(session);
        return session;
    }

    private async calculateSessionScores(session: ConversationSession) {
        try {
            const messageRepo = await this.db.getRepository(ConversationMessage);
            const messages = await messageRepo.find({
                where: { session: { id: session.id } },
                order: { createdAt: 'ASC' }
            });

            const transcript = messages.map(m => `${m.sender}: ${m.content}`).join('\n');

            const scores = await aiService.scoreSession({
                context: session.context.name,
                total_messages: session.totalMessages,
                error_count: session.errorCount,
                transcript
            });

            if (scores) {
                const sessionRepo = await this.db.getRepository(ConversationSession);
                await sessionRepo.update(session.id, {
                    grammarScore: scores.grammar_score,
                    fluencyScore: scores.fluency_score,
                    overallScore: scores.overall_score
                });
            }
        } catch (error) {
            console.error("Failed to calculate session scores:", error);
        }
    }

    async getUserSessions(user: User) {
        const repo = await this.db.getRepository(ConversationSession);
        return await repo.find({
            where: { user: { id: user.id } },
            order: { createdAt: 'DESC' },
            relations: ['context']
        });
    }

    async getSessionDetails(user: User, sessionId: string) {
        const repo = await this.db.getRepository(ConversationSession);
        return await repo.findOne({
            where: { id: sessionId, user: { id: user.id } },
            relations: ['context', 'messages']
        });
    }

    async deleteSession(user: User, sessionId: string) {
        const repo = await this.db.getRepository(ConversationSession);
        const session = await repo.findOne({ where: { id: sessionId, user: { id: user.id } } });
        if (!session) throw new Error("Session not found");
        
        await repo.remove(session);
        return true;
    }
}
