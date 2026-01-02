import { Request, Response } from 'express'
import { SuccessResponse } from '../core/success.response'
import { dashboardService } from '../services/dashboard.service'

// P0: Extract date filter from query
const getDateFilter = (req: Request) => ({
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined
})

class DashboardController {
    /**
     * Get overview metrics (4 KPI cards)
     * @query startDate, endDate - optional date range filter
     */
    getOverviewMetrics = async (req: Request, res: Response) => {
        const filter = getDateFilter(req)
        const metaData = await dashboardService.getOverviewMetrics(filter)
        return new SuccessResponse({
            message: 'Get dashboard overview successfully',
            metaData
        }).send(res)
    }

    /**
     * Get user analytics
     * @query startDate, endDate - optional date range filter
     */
    getUserAnalytics = async (req: Request, res: Response) => {
        const filter = getDateFilter(req)
        const metaData = await dashboardService.getUserAnalytics(filter)
        return new SuccessResponse({
            message: 'Get user analytics successfully',
            metaData
        }).send(res)
    }

    /**
     * Get learning analytics (categories, topics, words)
     * @query startDate, endDate - optional date range filter
     */
    getLearningAnalytics = async (req: Request, res: Response) => {
        const filter = getDateFilter(req)
        const metaData = await dashboardService.getLearningAnalytics(filter)
        return new SuccessResponse({
            message: 'Get learning analytics successfully',
            metaData
        }).send(res)
    }

    /**
     * Get revenue analytics
     * @query startDate, endDate - optional date range filter
     */
    getRevenueAnalytics = async (req: Request, res: Response) => {
        const filter = getDateFilter(req)
        const metaData = await dashboardService.getRevenueAnalytics(filter)
        return new SuccessResponse({
            message: 'Get revenue analytics successfully',
            metaData
        }).send(res)
    }

    /**
     * Get exam analytics
     * @query startDate, endDate - optional date range filter
     */
    getExamAnalytics = async (req: Request, res: Response) => {
        const filter = getDateFilter(req)
        const metaData = await dashboardService.getExamAnalytics(filter)
        return new SuccessResponse({
            message: 'Get exam analytics successfully',
            metaData
        }).send(res)
    }

    /**
     * Get recent activities
     */
    getRecentActivities = async (req: Request, res: Response) => {
        const limit = Number(req.query.limit) || 20
        const metaData = await dashboardService.getRecentActivities(limit)
        return new SuccessResponse({
            message: 'Get recent activities successfully',
            metaData
        }).send(res)
    }
}

export const dashboardController = new DashboardController()
