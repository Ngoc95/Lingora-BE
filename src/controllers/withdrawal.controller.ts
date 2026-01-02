import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from '../core/success.response'
import { withdrawalService } from '../services/withdrawal.service'

class WithdrawalController {
    // User endpoints
    createWithdrawal = async (req: Request, res: Response) => {
        const userId = req.user!.id
        return new CREATED({
            message: 'Withdrawal request created successfully',
            metaData: await withdrawalService.createWithdrawalRequest(userId, req.body)
        }).send(res)
    }

    getMyWithdrawals = async (req: Request, res: Response) => {
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Get withdrawal requests successfully',
            metaData: await withdrawalService.getUserWithdrawals(userId, {
                ...(req.query as any),
                ...(req.parseQueryPagination || {}),
                sort: req.sortParsed,
            })
        }).send(res)
    }

    getMyWithdrawalById = async (req: Request, res: Response) => {
        const withdrawalId = parseInt(req.params?.id)
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Get withdrawal request successfully',
            metaData: await withdrawalService.getWithdrawalById(withdrawalId, userId)
        }).send(res)
    }

    getMyBalance = async (req: Request, res: Response) => {
        const userId = req.user!.id
        return new SuccessResponse({
            message: 'Get balance successfully',
            metaData: await withdrawalService.getUserBalance(userId)
        }).send(res)
    }

    // Admin endpoints
    getAllWithdrawals = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get all withdrawal requests successfully',
            metaData: await withdrawalService.getAllWithdrawals({
                ...(req.query as any),
                ...(req.parseQueryPagination || {}),
                sort: req.sortParsed,
            })
        }).send(res)
    }

    getWithdrawalByIdAdmin = async (req: Request, res: Response) => {
        const withdrawalId = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Get withdrawal request successfully',
            metaData: await withdrawalService.getWithdrawalByIdAdmin(withdrawalId)
        }).send(res)
    }

    approveWithdrawal = async (req: Request, res: Response) => {
        const withdrawalId = parseInt(req.params?.id)
        const adminId = req.user!.id
        return new SuccessResponse({
            message: 'Withdrawal request approved successfully',
            metaData: await withdrawalService.approveWithdrawal(withdrawalId, adminId)
        }).send(res)
    }

    rejectWithdrawal = async (req: Request, res: Response) => {
        const withdrawalId = parseInt(req.params?.id)
        const adminId = req.user!.id
        const reason = req.body.rejectionReason
        return new SuccessResponse({
            message: 'Withdrawal request rejected successfully',
            metaData: await withdrawalService.rejectWithdrawal(withdrawalId, adminId, reason)
        }).send(res)
    }

    completeWithdrawal = async (req: Request, res: Response) => {
        const withdrawalId = parseInt(req.params?.id)
        const adminId = req.user!.id
        const transactionReference = req.body.transactionReference
        return new SuccessResponse({
            message: 'Withdrawal request completed successfully',
            metaData: await withdrawalService.completeWithdrawal(withdrawalId, adminId, transactionReference)
        }).send(res)
    }

    failWithdrawal = async (req: Request, res: Response) => {
        const withdrawalId = parseInt(req.params?.id)
        const adminId = req.user!.id
        const reason = req.body.reason
        return new SuccessResponse({
            message: 'Withdrawal request marked as failed',
            metaData: await withdrawalService.failWithdrawal(withdrawalId, adminId, reason)
        }).send(res)
    }
}

export const withdrawalController = new WithdrawalController()

