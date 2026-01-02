import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { CREATED, SuccessResponse } from '../core/success.response'
import { CreateReportBodyReq } from '../dtos/req/report/createReportBody.req'
import { UpdateReportStatusBodyReq } from '../dtos/req/report/updateReportStatusBody.req'
import { User } from '../entities/user.entity'
import { reportService } from '../services/report.service'
import { GetAllReportsQueryReq } from '../dtos/req/report/getAllReportsQuery.req'
import { ReportStatus } from '../enums/reportStatus.enum'
import { TargetType } from '../enums/targetType.enum'

class ReportController {
    create = async (req: Request<ParamsDictionary, any, CreateReportBodyReq>, res: Response) => {
        const user = req.user as User

        return new CREATED({
            message: 'Report created successfully!',
            metaData: await reportService.createReport(user.id as number, req.body)
        }).send(res)
    }

    getAll = async (req: Request, res: Response) => {
        // Parse query parameters
        const query: GetAllReportsQueryReq = {
            ...req.parseQueryPagination,
            sort: req.sortParsed,
            status: req.query.status ? (req.query.status as ReportStatus) : undefined,
            targetType: req.query.targetType ? (req.query.targetType as TargetType) : undefined,
            reportType: req.query.reportType ? (req.query.reportType as any) : undefined,
            createdBy: req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined,
            search: req.query.search ? (req.query.search as string) : undefined
        }

        return new SuccessResponse({
            message: 'Get all reports successfully!',
            metaData: await reportService.getAllReports(query)
        }).send(res)
    }

    getById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)

        return new SuccessResponse({
            message: 'Get report by id successfully!',
            metaData: await reportService.getReportById(id)
        }).send(res)
    }

    updateStatus = async (req: Request<ParamsDictionary, any, UpdateReportStatusBodyReq>, res: Response) => {
        const id = parseInt(req.params?.id)

        return new SuccessResponse({
            message: 'Update report status successfully!',
            metaData: await reportService.updateReportStatus(id, req.body)
        }).send(res)
    }

    handleReport = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)

        const result = await reportService.handleReport(id, req.body)

        return new SuccessResponse({
            message: 'Report handled successfully!',
            metaData: result
        }).send(res)
    }

    delete = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)

        return new SuccessResponse({
            message: 'Delete report successfully!',
            metaData: await reportService.deleteReport(id)
        }).send(res)
    }
}

export const reportController = new ReportController()
