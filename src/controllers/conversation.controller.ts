import { Request, Response, NextFunction } from 'express';
import { ConversationService } from '~/services/conversation.service';
import { CreateSessionDto, SendMessageDto } from '~/dtos/req/conversation/conversation.dto';
import { plainToInstance } from 'class-transformer';
import { CREATED, OK } from '~/core/success.response';
import { BadRequestError } from '~/core/error.response';

export class ConversationController {
    private conversationService = ConversationService.getInstance();

    getContexts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const contexts = await this.conversationService.getActiveContexts();
            new OK({
                message: "Get conversation contexts successfully",
                metaData: contexts
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    getTemplates = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const contextId = parseInt(req.params.id);
            if (isNaN(contextId)) throw new BadRequestError({ message: "Invalid context id" });

            const templates = await this.conversationService.getContextTemplates(contextId);
            new OK({
                message: "Get suggestion templates successfully",
                metaData: templates
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    createSession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dto = plainToInstance(CreateSessionDto, req.body);
            const user = req.user!;

            const session = await this.conversationService.createSession(user, dto.contextId);
            new CREATED({
                message: "Create conversation session successfully",
                metaData: session
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    sendMessage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dto = plainToInstance(SendMessageDto, req.body);
            const sessionId = req.params.id;
            const user = req.user!;

            const result = await this.conversationService.sendMessage(user, sessionId, dto.question);
            new OK({
                message: "Send message successfully",
                metaData: result
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    endSession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = req.params.id;
            const user = req.user!;

            const session = await this.conversationService.endSession(user, sessionId);
            new OK({
                message: "End conversation session successfully",
                metaData: session
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    getUserSessions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user!;
            const sessions = await this.conversationService.getUserSessions(user);
            new OK({
                message: "Get user conversation sessions successfully",
                metaData: sessions
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    getSessionDetails = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = req.params.id;
            const user = req.user!;

            const session = await this.conversationService.getSessionDetails(user, sessionId);
            if (!session) throw new BadRequestError({ message: "Session not found" });

            new OK({
                message: "Get conversation session details successfully",
                metaData: session
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    deleteSession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = req.params.id;
            const user = req.user!;

            await this.conversationService.deleteSession(user, sessionId);
            new OK({
                message: "Delete conversation session successfully",
                metaData: { success: true }
            }).send(res);
        } catch (error) {
            next(error);
        }
    };
}
