import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from '../core/success.response'
import { studySetService } from '../services/studySet.service'

class StudySetController {
    createStudySet = async (req: Request, res: Response) => {
        const userId = req.user!.id
        const result = await studySetService.createStudySet(userId, req.body)
        return new CREATED({
            message: 'Create study set successfully',
            metaData: result || {},
        }).send(res)
    }

    getAllStudySets = async (req: Request, res: Response) => {
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Get all study sets successfully',
            metaData: await studySetService.getAllStudySets(userId, {
                ...(req.query as any),
                ...(req.parseQueryPagination || {}),
                sort: req.sortParsed,
            }),
        }).send(res)
    }

    getOwnStudySets = async (req: Request, res: Response) => {
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Get own study sets successfully',
            metaData: await studySetService.getOwnStudySets(userId, {
                ...(req.query as any),
                ...(req.parseQueryPagination || {}),
                sort: req.sortParsed,
            }),
        }).send(res)
    }

    getStudySetById = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        const userId = req.user!.id
        const isAdmin = req.user!.roles?.some((role: any) => role.name === 'ADMIN') || false
        return new SuccessResponse({
            message: 'Get study set successfully',
            metaData: await studySetService.getStudySetById(studySetId, userId, isAdmin),
        }).send(res)
    }

    updateStudySetById = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        const userId = req.user!.id
        const result = await studySetService.updateStudySetById(studySetId, userId, req.body)
        return new SuccessResponse({
            message: 'Update study set successfully',
            metaData: result || {},
        }).send(res)
    }

    deleteStudySetById = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Delete study set successfully',
            metaData: await studySetService.deleteStudySetById(studySetId, userId),
        }).send(res)
    }

    buyStudySet = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        const userId = req.user!.id
        const ipAddr = req.ip || req.socket.remoteAddress || '127.0.0.1'
        return new SuccessResponse({
            message: 'Create payment URL successfully',
            metaData: await studySetService.buyStudySet(studySetId, userId, ipAddr),
        }).send(res)
    }
}

export const studySetController = new StudySetController()

