import { Router } from 'express'
import { notificationController } from '~/controllers/notification.controller'
import { accessTokenValidation } from '~/middlewares/auth.middlewares'
import { checkIdParamMiddleware, checkQueryMiddleware } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handler'

const notificationRouter = Router()

// Access token validation
notificationRouter.use(accessTokenValidation)

// GET
/**
 * @description : Get notifications for current user
 * @method : GET
 * @path : /notifications
 * @header : Authorization
 * @query : {
 *   page?: number
 *   limit?: number
 *   isRead?: boolean
 * }
 */
notificationRouter.get(
    '',
    checkQueryMiddleware({
        booleanFields: ['isRead'],
    }),
    wrapRequestHandler(notificationController.getNotifications)
)

// GET
/**
 * @description : Get unread notification count
 * @method : GET
 * @path : /notifications/unread-count
 * @header : Authorization
 */
notificationRouter.get(
    '/unread-count',
    wrapRequestHandler(notificationController.getUnreadCount)
)

// PATCH
/**
 * @description : Mark notification as read
 * @method : PATCH
 * @path : /notifications/:id/read
 * @header : Authorization
 * @params : id
 */
notificationRouter.patch(
    '/:id/read',
    checkIdParamMiddleware,
    wrapRequestHandler(notificationController.markAsRead)
)

// PATCH
/**
 * @description : Mark all notifications as read
 * @method : PATCH
 * @path : /notifications/read-all
 * @header : Authorization
 */
notificationRouter.patch(
    '/read-all',
    wrapRequestHandler(notificationController.markAllAsRead)
)

export default notificationRouter

