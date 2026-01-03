import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from '~/core/success.response'
import { categoryProgressService } from '~/services/userCategoryProgress.service'
import { topicProgressService } from '~/services/userTopicProgress.service'
import { wordProgressService } from '~/services/userWordProgress.service'

class UserProgressController {
    createManyWordProgress = async (req: Request, res: Response) => {
        return new CREATED({
            message: 'Create new word progress successfully',
            metaData: await wordProgressService.createManyWordProgress(req.user!.id, req.body)
        }).send(res);
    }

    updateManyWordProgress = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Update word progress successfully',
            metaData: await wordProgressService.updateManyWordProgress(req.user!.id, req.body)
        }).send(res)
    }

    getAllCategoriesForUser = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get all categories with user progress successfully',
            metaData: await categoryProgressService.getAllCategoriesForUser(req.user!, {
                ...req.query,
                ...req.parseQueryPagination,
            })
        }).send(res)
    }

    getCategoryProgressById = async (req: Request, res: Response) => {
        const user = req.user!
        const categoryId = Number(req.params.id)

        return new SuccessResponse({
            message: 'Get category progress successfully',
            metaData: await categoryProgressService.getCategoryProgressById(user, categoryId, {
                ...req.query,
                ...req.parseQueryPagination,
                sort: req.sortParsed
            })
        }).send(res)
    }

    getTopicProgressById = async (req: Request, res: Response) => {
        const user = req.user!
        const topicId = Number(req.params.id)

        return new SuccessResponse({
            message: 'Get topic progress successfully',
            metaData: await topicProgressService.getTopicProgressById(user, topicId, {
                ...req.query,
                ...req.parseQueryPagination,
                ...req.parseQueryBoolean,
            })
        }).send(res)
    }

    getWordsForStudy= async (req: Request, res: Response) => {
        const user = req.user!
        const topicId = Number(req.params.id)
        const count = Number(req.query.count)
        return new SuccessResponse({
            message: 'Get words for study successfully',
            metaData: await wordProgressService.getWordsForStudy(user, topicId, count)
        }).send(res)
    }

    getWordsForReview= async (req: Request, res: Response) => {
        const user = req.user!
        return new SuccessResponse({
            message: 'Get words for review successfully',
            metaData: await wordProgressService.getWordsForReview(user, {
                ...req.parseQueryPagination,
            })
        }).send(res)
    }

    getWordStatisticsByUser = async (req: Request, res: Response) => {
        const user = req.user!
        return new SuccessResponse({
            message: 'Get word statistics for user successfully',
            metaData: await wordProgressService.getWordStatisticsByUser(user)
        }).send(res)
    }
}

export const userProgressController = new UserProgressController()