import express from 'express';
import { ConversationController } from '~/controllers/conversation.controller';
import { accessTokenValidation } from '~/middlewares/auth.middlewares';
import { dtoValidation } from '~/middlewares/dtoValidation.middleware';
import { CreateSessionDto, SendMessageDto } from '~/dtos/req/conversation/conversation.dto';

const router = express.Router();
const controller = new ConversationController();

// Public routes for contexts and templates (or authenticated depending on requirement)
// Assume authenticated for all conversation features
router.use(accessTokenValidation);

// Contexts & Templates
router.get('/contexts', controller.getContexts);
router.get('/contexts/:id/templates', controller.getTemplates);

// Sessions
router.post('/sessions', dtoValidation(CreateSessionDto), controller.createSession);
router.get('/sessions', controller.getUserSessions);
router.get('/sessions/:id', controller.getSessionDetails);
router.delete('/sessions/:id', controller.deleteSession);

// Actions in a session
router.post('/sessions/:id/messages', dtoValidation(SendMessageDto), controller.sendMessage);
router.patch('/sessions/:id/end', controller.endSession);

export default router;
