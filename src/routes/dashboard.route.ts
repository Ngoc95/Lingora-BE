import { Router } from 'express'
import { dashboardController } from '../controllers/dashboard.controller'
import { accessTokenValidation, checkPermission } from '../middlewares/auth.middlewares'
import { wrapRequestHandler } from '../utils/handler'
import { Resource } from '../enums/resource.enum'

const dashboardRouter = Router()

// All dashboard routes require admin authentication
dashboardRouter.use(accessTokenValidation)

/**
 * @description : Get overview metrics (4 KPI cards)
 * @method : GET
 * @path : /admin/dashboard/overview
 * @header : Authorization
 */
dashboardRouter.get(
    '/overview',
    wrapRequestHandler(checkPermission('readAny', Resource.USER)),
    wrapRequestHandler(dashboardController.getOverviewMetrics)
)

/**
 * @description : Get user analytics
 * @method : GET
 * @path : /admin/dashboard/users
 * @header : Authorization
 */
dashboardRouter.get(
    '/users',
    wrapRequestHandler(checkPermission('readAny', Resource.USER)),
    wrapRequestHandler(dashboardController.getUserAnalytics)
)

/**
 * @description : Get learning analytics (categories, topics, words)
 * @method : GET
 * @path : /admin/dashboard/learning
 * @header : Authorization
 */
dashboardRouter.get(
    '/learning',
    wrapRequestHandler(checkPermission('readAny', Resource.USER)),
    wrapRequestHandler(dashboardController.getLearningAnalytics)
)

/**
 * @description : Get revenue analytics
 * @method : GET
 * @path : /admin/dashboard/revenue
 * @header : Authorization
 */
dashboardRouter.get(
    '/revenue',
    wrapRequestHandler(checkPermission('readAny', Resource.USER)),
    wrapRequestHandler(dashboardController.getRevenueAnalytics)
)

/**
 * @description : Get exam analytics
 * @method : GET
 * @path : /admin/dashboard/exams
 * @header : Authorization
 */
dashboardRouter.get(
    '/exams',
    wrapRequestHandler(checkPermission('readAny', Resource.USER)),
    wrapRequestHandler(dashboardController.getExamAnalytics)
)

/**
 * @description : Get recent activities
 * @method : GET
 * @path : /admin/dashboard/activities
 * @header : Authorization
 * @query : { limit?: number }
 */
dashboardRouter.get(
    '/activities',
    wrapRequestHandler(checkPermission('readAny', Resource.USER)),
    wrapRequestHandler(dashboardController.getRecentActivities)
)

export default dashboardRouter
