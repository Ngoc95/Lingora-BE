import { Request, Response } from 'express'
import { SuccessResponse } from '~/core/success.response'
import { adminStudySetService } from '~/services/adminStudySet.service'

class AdminStudySetController {
    getAllStudySets = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get all study sets successfully',
            metaData: await adminStudySetService.getAllStudySets({
                ...(req.query as any),
                ...(req.parseQueryPagination || {}),
                sort: req.sortParsed,
            }),
        }).send(res)
    }

    getPendingStudySets = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get pending study sets successfully',
            metaData: await adminStudySetService.getPendingStudySets({
                ...(req.query as any),
                ...(req.parseQueryPagination || {}),
                sort: req.sortParsed,
            }),
        }).send(res)
    }

    getStudySetById = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Get study set successfully',
            metaData: await adminStudySetService.getStudySetById(studySetId),
        }).send(res)
    }

    approveStudySet = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Approve study set successfully',
            metaData: await adminStudySetService.approveStudySet(studySetId),
        }).send(res)
    }

    rejectStudySet = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        const reason = req.body.reason
        return new SuccessResponse({
            message: 'Reject study set successfully',
            metaData: await adminStudySetService.rejectStudySet(studySetId, reason),
        }).send(res)
    }

    updateStudySetStatus = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        const { status } = req.body
        return new SuccessResponse({
            message: 'Update study set status successfully',
            metaData: await adminStudySetService.updateStudySetStatus(studySetId, status),
        }).send(res)
    }

    deleteStudySetById = async (req: Request, res: Response) => {
        const studySetId = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Delete study set successfully',
            metaData: await adminStudySetService.deleteStudySetById(studySetId),
        }).send(res)
    }
}

export const adminStudySetController = new AdminStudySetController()

