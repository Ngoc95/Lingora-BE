import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from "~/core/success.response"
import { categoryProgressService } from '~/services/userCategoryProgress.service';
import { topicProgressService } from '~/services/userTopicProgress.service';
import { wordProgressService } from '~/services/userWordProgress.service';

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

    getTopicProgress = async (req: Request, res: Response) => {
        const user = req.user!
        const topicId = Number(req.params.id)

        return new SuccessResponse({
            message: 'Get topic progress successfully',
            metaData: await topicProgressService.getTopicProgress(user, topicId)
        }).send(res)
    }

    getCategoryProgress = async (req: Request, res: Response) => {
        const user = req.user!
        const categoryId = Number(req.params.id)

        return new SuccessResponse({
            message: 'Get category progress successfully',
            metaData: await categoryProgressService.getCategoryProgress(user, categoryId)
        }).send(res)
    }
}
export const userProgressController = new UserProgressController()