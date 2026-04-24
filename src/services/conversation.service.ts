import { DatabaseService } from "./database.service";
import { aiService } from "./ai.service";
import { ConversationContext } from "~/entities/conversationContext.entity";
import { ConversationSession } from "~/entities/conversationSession.entity";
import { ConversationMessage, ChatSender } from "~/entities/conversationMessage.entity";
import { ConversationSuggestionTemplate } from "~/entities/conversationSuggestionTemplate.entity";
import { User } from "~/entities/user.entity";
import { ConversationStatus } from "~/enums/conversationStatus.enum";
import { ILike, FindOptionsWhere } from "typeorm";
import validator from "validator";
import { BadRequestError, NotFoundRequestError } from "~/core/error.response";
import eventBus from "~/events-handler/eventBus";
import { EVENTS } from "~/events-handler/constants";

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

    async getActiveContexts(page: number = 1, limit: number = 10, search?: string, sort?: Record<string, "ASC" | "DESC">) {
        const repo = await this.db.getRepository(ConversationContext);
        const skip = (page - 1) * limit;

        let where: FindOptionsWhere<ConversationContext> | FindOptionsWhere<ConversationContext>[] = { isActive: true };

        if (search) {
            const normalized = validator.trim(search).toLowerCase();
            // Since we only have 'name' and 'description' to search potentially
            where = [
                { isActive: true, name: ILike(`%${normalized}%`) },
                { isActive: true, description: ILike(`%${normalized}%`) }
            ];
        }

        const sortOptions = sort && Object.keys(sort).length > 0 ? sort : { sortOrder: 'ASC' as const };

        const [contexts, total] = await repo.findAndCount({
            where,
            order: sortOptions,
            skip,
            take: limit
        });

        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            contexts
        };
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

        const context = await contextRepo.findOneBy({ id: contextId, isActive: true });
        if (!context) throw new NotFoundRequestError("Conversation Context not found or inactive");

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

        const templateRepo = await this.db.getRepository(ConversationSuggestionTemplate);
        const templates = await templateRepo.find({
            where: { context: { id: contextId }, phase: 'opening' },
            order: { sortOrder: 'ASC' }
        });
        const promptTemplates = templates.map(t => t.suggestionText);

        // Generate opening message from AI
        const aiOpeningResult = await aiService.startConversation({
            system_prompt: context.systemPrompt,
            context: context.description,
            difficulty: context.difficultyLevel,
            templates: promptTemplates
        });

        if (aiOpeningResult) {
            const aiMessage = messageRepo.create({
                session: { id: session.id },
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

        if (!session) throw new NotFoundRequestError("Session not found");
        if (session.status === ConversationStatus.COMPLETED) {
            throw new BadRequestError({ message: "Cannot send message. Session is already completed." });
        }

        const history = (session.messages || [])
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map(m => ({
                sender: m.sender.toString(),
                content: m.content
            }));

        const templateRepo = await this.db.getRepository(ConversationSuggestionTemplate);
        const templates = await templateRepo.find({
            where: { context: { id: session.context.id }, phase: session.currentPhase },
            order: { sortOrder: 'ASC' }
        });
        const promptTemplates = templates.map(t => t.suggestionText);

        const aiResult = await aiService.sendConversation({
            question,
            system_prompt: session.context.systemPrompt,
            context: session.context.description,
            difficulty: session.context.difficultyLevel,
            current_phase: session.currentPhase,
            history,
            templates: promptTemplates
        });

        if (!aiResult) {
            throw new Error("Failed to get response from AI Service");
        }

        // Save User Message
        const userMessage = messageRepo.create({
            session: { id: session.id },
            sender: ChatSender.USER,
            content: question
        });
        await messageRepo.save(userMessage);

        // Save AI Message with corrections and suggestions
        const aiMessage = messageRepo.create({
            session: { id: session.id },
            sender: ChatSender.AI,
            content: aiResult.response,
            corrections: aiResult.correction?.has_error ? aiResult.correction : null,
            suggestions: aiResult.suggestions,
            improvement: aiResult.improvement?.has_improvement ? aiResult.improvement : null,
            vocabulary: aiResult.vocabulary_highlight ? {
                highlight: aiResult.vocabulary_highlight,
                meaning: aiResult.vocabulary_meaning
            } : null
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

        // Prevent TypeORM from attempting to sync the 'messages' array
        // which would orphan the newly created messages by setting sessionId to null
        delete session.messages;

        // Auto end session if AI marks it as completed
        if (session.currentPhase === 'completed') {
            session.status = ConversationStatus.COMPLETED;
            session.endedAt = new Date();
            await sessionRepo.save(session);

            // Await to ensure scores and feedback are computed before responding
            await this.calculateSessionScores(session);

            eventBus.emit(EVENTS.CONVERSATION_ENDED, {
                userId: user.id,
                referencedId: null,
                description: session.id,
                messageCount: session.totalMessages
            });
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

        if (!session) throw new NotFoundRequestError("Session not found");
        if (session.status === ConversationStatus.COMPLETED) return session;

        session.status = ConversationStatus.COMPLETED;
        session.currentPhase = 'completed';
        session.endedAt = new Date();
        await sessionRepo.save(session);
        
        await this.calculateSessionScores(session);

        eventBus.emit(EVENTS.CONVERSATION_ENDED, {
            userId: user.id,
            referencedId: null,
            description: session.id,
            messageCount: session.totalMessages
        });

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
                    overallScore: scores.overall_score,
                    feedback: scores.feedback
                });

                // Update in-memory session object so that the caller can return the latest scores immediately
                session.grammarScore = scores.grammar_score;
                session.fluencyScore = scores.fluency_score;
                session.overallScore = scores.overall_score;
                session.feedback = scores.feedback;
            }
        } catch (error) {
            console.error("Failed to calculate session scores:", error);
        }
    }

    async getUserSessions(user: User, page: number = 1, limit: number = 10, search?: string, sort?: Record<string, "ASC" | "DESC">) {
        const repo = await this.db.getRepository(ConversationSession);
        const skip = (page - 1) * limit;

        let where: FindOptionsWhere<ConversationSession> | FindOptionsWhere<ConversationSession>[] = { user: { id: user.id } };

        if (search) {
            const normalized = validator.trim(search).toLowerCase();
            where = [
                { user: { id: user.id }, title: ILike(`%${normalized}%`) },
                { user: { id: user.id }, context: { name: ILike(`%${normalized}%`) } }
            ];
        }

        const sortOptions = sort && Object.keys(sort).length > 0 ? sort : { createdAt: 'DESC' as const };

        const [sessions, total] = await repo.findAndCount({
            where,
            order: sortOptions,
            skip,
            take: limit,
            relations: ['context']
        });

        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            sessions
        };
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
