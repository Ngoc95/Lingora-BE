import { Router } from 'express'
import { notificationController } from '../controllers/notification.controller'
import { accessTokenValidation } from '../middlewares/auth.middlewares';
import { checkIdParamMiddleware, checkQueryMiddleware } from '../middlewares/common.middlewares';
import { wrapRequestHandler } from '../utils/handler';

const notificationRouter = Router()

// access token validation
notificationRouter.use(accessTokenValidation);

// GET
/**
 * @description : Get all notifications
 * @method : GET
 * @path : /notifications?limit=&page=
 * @header : Authorization
 * @query : {limit: number, page:number}
 */
notificationRouter.get(
    '', 
    checkQueryMiddleware(),
    wrapRequestHandler(notificationController.getAllNotifications)
);

// PATCH
/**
 * @description : Update a notification as read
 * @method : PATCH
 * @path : /notifications/:id
 * @header : Authorization
 * @params : id (number)
 */
notificationRouter.patch(
    '/:id',
    checkIdParamMiddleware,
    wrapRequestHandler(notificationController.updateReadNotification)
)

export default notificationRouter
