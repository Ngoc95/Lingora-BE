import express from 'express';
import { ConversationController } from '~/controllers/conversation.controller';
import { accessTokenValidation } from '~/middlewares/auth.middlewares';
import { dtoValidation } from '~/middlewares/dtoValidation.middleware';
import { CreateSessionDto, SendMessageDto } from '~/dtos/req/conversation/conversation.dto';
import { checkQueryMiddleware, parseSort } from '~/middlewares/common.middlewares';
import { wrapRequestHandler } from '~/utils/handler';
import { ConversationContext } from '~/entities/conversationContext.entity';
import { ConversationSession } from '~/entities/conversationSession.entity';

const router = express.Router();
const controller = new ConversationController();

// Public routes for contexts and templates (or authenticated depending on requirement)
// Assume authenticated for all conversation features
router.use(accessTokenValidation);

// Contexts & Templates
router.get(
    '/contexts',
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: ConversationContext.allowSortList })),
    wrapRequestHandler(controller.getContexts)
);
router.get('/contexts/:id/templates', wrapRequestHandler(controller.getTemplates));

// Sessions
router.post('/sessions', dtoValidation(CreateSessionDto), wrapRequestHandler(controller.createSession));
router.get(
    '/sessions',
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: ConversationSession.allowSortList })),
    wrapRequestHandler(controller.getUserSessions)
);
router.get('/sessions/:id', wrapRequestHandler(controller.getSessionDetails));
router.delete('/sessions/:id', wrapRequestHandler(controller.deleteSession));

// Actions in a session
router.post('/sessions/:id/messages', dtoValidation(SendMessageDto), wrapRequestHandler(controller.sendMessage));
router.patch('/sessions/:id/end', wrapRequestHandler(controller.endSession));

export default router;
