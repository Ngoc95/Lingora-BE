import { DatabaseService } from './database.service'
import { WithdrawalRequest } from '~/entities/withdrawalRequest.entity'
import { User } from '~/entities/user.entity'
import { BadRequestError, NotFoundRequestError, ForbiddenRequestError } from '~/core/error.response'
import { CreateWithdrawalBodyReq } from '~/dtos/req/withdrawal/createWithdrawalBody.req'
import { WithdrawalQueryReq } from '~/dtos/req/withdrawal/withdrawalQuery.req'
import { WithdrawalStatus } from '~/enums/withdrawalStatus.enum'
import { FindOptionsWhere, In } from 'typeorm'
import eventBus from '~/events-handler/eventBus'
import { EVENTS } from '~/events-handler/constants'

const MIN_WITHDRAWAL_AMOUNT = 50000 // 50,000 VND
const MAX_WITHDRAWAL_AMOUNT = 50000000 // 50,000,000 VND

class WithdrawalService {
    private db = DatabaseService.getInstance()

    /**
     * Create withdrawal request
     */
    createWithdrawalRequest = async (userId: number, data: CreateWithdrawalBodyReq) => {
        const withdrawalRepo = await this.db.getRepository(WithdrawalRequest)
        const userRepo = await this.db.getRepository(User)

        // Validate amount
        if (data.amount < MIN_WITHDRAWAL_AMOUNT) {
            throw new BadRequestError({ 
                message: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT.toLocaleString('vi-VN')}đ` 
            })
        }
        if (data.amount > MAX_WITHDRAWAL_AMOUNT) {
            throw new BadRequestError({ 
                message: `Maximum withdrawal amount is ${MAX_WITHDRAWAL_AMOUNT.toLocaleString('vi-VN')}đ` 
            })
        }

        // Get user
        const user = await userRepo.findOne({ where: { id: userId } })
        if (!user) {
            throw new NotFoundRequestError('User not found')
        }

        // Calculate available balance
        const pendingRequests = await withdrawalRepo
            .createQueryBuilder('withdrawal')
            .select('COALESCE(SUM(withdrawal.amount), 0)', 'total')
            .where('withdrawal.userId = :userId', { userId })
            .andWhere('withdrawal.status IN (:...statuses)', { 
                statuses: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] 
            })
            .getRawOne()

        const pendingAmount = Number(pendingRequests?.total || 0)
        const totalEarnings = Number(user.totalEarnings || 0)
        const withdrawnAmount = Number(user.withdrawnAmount || 0)
        const availableBalance = totalEarnings - withdrawnAmount - pendingAmount

        if (data.amount > availableBalance) {
            throw new BadRequestError({ 
                message: `Insufficient balance. Available: ${availableBalance.toLocaleString('vi-VN')}đ` 
            })
        }

        // Check if user has pending withdrawal request
        const existingPending = await withdrawalRepo.findOne({
            where: {
                user: { id: userId },
                status: WithdrawalStatus.PENDING
            }
        })

        if (existingPending) {
            throw new BadRequestError({ 
                message: 'You have a pending withdrawal request. Please wait for it to be processed.' 
            })
        }

        // Create withdrawal request
        const withdrawalRequest = withdrawalRepo.create({
            user: { id: userId } as any,
            amount: data.amount,
            bankName: data.bankName,
            bankAccountNumber: data.bankAccountNumber,
            bankAccountName: data.bankAccountName,
            bankBranch: data.bankBranch,
            status: WithdrawalStatus.PENDING
        })

        const savedRequest = await withdrawalRepo.save(withdrawalRequest)

        // Update user's pendingWithdrawal
        user.pendingWithdrawal = Number(user.pendingWithdrawal || 0) + data.amount
        await userRepo.save(user)

        return savedRequest
    }

    /**
     * Get user's withdrawal requests
     */
    getUserWithdrawals = async (userId: number, query: WithdrawalQueryReq) => {
        const { page = 1, limit = 20, status, sort } = query
        const skip = (page - 1) * limit

        const where: FindOptionsWhere<WithdrawalRequest> = {
            user: { id: userId }
        }

        if (status) {
            where.status = status
        }

        const [withdrawals, total] = await WithdrawalRequest.findAndCount({
            where,
            skip,
            take: limit,
            order: sort || { createdAt: 'DESC' },
            relations: ['user'],
            select: {
                id: true,
                amount: true,
                bankName: true,
                bankAccountNumber: true,
                bankAccountName: true,
                bankBranch: true,
                status: true,
                rejectionReason: true,
                transactionReference: true,
                processedBy: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true
                }
            }
        })

        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            withdrawals
        }
    }

    /**
     * Get withdrawal by ID (for user)
     */
    getWithdrawalById = async (withdrawalId: number, userId: number) => {
        const withdrawal = await WithdrawalRequest.findOne({
            where: { id: withdrawalId },
            relations: ['user'],
            select: {
                id: true,
                amount: true,
                bankName: true,
                bankAccountNumber: true,
                bankAccountName: true,
                bankBranch: true,
                status: true,
                rejectionReason: true,
                transactionReference: true,
                processedBy: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true
                }
            }
        })

        if (!withdrawal) {
            throw new NotFoundRequestError('Withdrawal request not found')
        }

        // Check if user owns this withdrawal
        if (withdrawal.user.id !== userId) {
            throw new ForbiddenRequestError('You do not have permission to view this withdrawal')
        }

        return withdrawal
    }

    /**
     * Get user balance
     */
    getUserBalance = async (userId: number) => {
        const user = await User.findOne({ where: { id: userId } })
        if (!user) {
            throw new NotFoundRequestError('User not found')
        }

        const withdrawalRepo = await this.db.getRepository(WithdrawalRequest)
        const pendingRequests = await withdrawalRepo
            .createQueryBuilder('withdrawal')
            .select('COALESCE(SUM(withdrawal.amount), 0)', 'total')
            .where('withdrawal.userId = :userId', { userId })
            .andWhere('withdrawal.status IN (:...statuses)', { 
                statuses: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] 
            })
            .getRawOne()

        const pendingAmount = Number(pendingRequests?.total || 0)
        const totalEarnings = Number(user.totalEarnings || 0)
        const withdrawnAmount = Number(user.withdrawnAmount || 0)
        const availableBalance = totalEarnings - withdrawnAmount - pendingAmount

        return {
            totalEarnings,
            withdrawnAmount,
            pendingWithdrawal: pendingAmount,
            availableBalance
        }
    }

    /**
     * Get all withdrawal requests (Admin only)
     */
    getAllWithdrawals = async (query: WithdrawalQueryReq) => {
        const { page = 1, limit = 20, status, userId, sort } = query
        const skip = (page - 1) * limit

        const where: FindOptionsWhere<WithdrawalRequest> = {}

        if (status) {
            where.status = status
        }

        if (userId) {
            where.user = { id: userId }
        }

        const [withdrawals, total] = await WithdrawalRequest.findAndCount({
            where,
            skip,
            take: limit,
            order: sort || { createdAt: 'DESC' },
            relations: ['user'],
            select: {
                id: true,
                amount: true,
                bankName: true,
                bankAccountNumber: true,
                bankAccountName: true,
                bankBranch: true,
                status: true,
                rejectionReason: true,
                transactionReference: true,
                processedBy: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    id: true,
                    username: true,
                    email: true,
                }
            }
        })

        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            withdrawals
        }
    }

    /**
     * Get withdrawal by ID (Admin)
     */
    getWithdrawalByIdAdmin = async (withdrawalId: number) => {
        const withdrawal = await WithdrawalRequest.findOne({
            where: { id: withdrawalId },
            relations: ['user'],
            select: {
                id: true,
                amount: true,
                bankName: true,
                bankAccountNumber: true,
                bankAccountName: true,
                bankBranch: true,
                status: true,
                rejectionReason: true,
                transactionReference: true,
                processedBy: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true
                }
            }
        })

        if (!withdrawal) {
            throw new NotFoundRequestError('Withdrawal request not found')
        }

        return withdrawal
    }

    /**
     * Approve withdrawal request (Admin)
     */
    approveWithdrawal = async (withdrawalId: number, adminId: number) => {
        const withdrawalRepo = await this.db.getRepository(WithdrawalRequest)
        const userRepo = await this.db.getRepository(User)

        const withdrawal = await withdrawalRepo.findOne({
            where: { id: withdrawalId },
            relations: ['user']
        })

        if (!withdrawal) {
            throw new NotFoundRequestError('Withdrawal request not found')
        }

        if (withdrawal.status !== WithdrawalStatus.PENDING) {
            throw new BadRequestError({ 
                message: `Cannot approve withdrawal with status: ${withdrawal.status}` 
            })
        }

        // Use transaction to ensure atomicity
        await this.db.dataSource.transaction(async (manager) => {
            // Update withdrawal status to PROCESSING
            // Note: Don't change user balance yet - keep pendingWithdrawal locked
            // Balance will be updated when status changes to COMPLETED
            withdrawal.status = WithdrawalStatus.PROCESSING
            withdrawal.processedBy = adminId
            await manager.save(withdrawal)

            // TODO: Call payment gateway API to transfer money
            // For now, we'll set it to PROCESSING and admin can manually complete it later
            // Example: VNPay Disburse API, MoMo Payout API, etc.
            // const transferResult = await this.transferToBank({
            //     bankName: withdrawal.bankName,
            //     accountNumber: withdrawal.bankAccountNumber,
            //     accountName: withdrawal.bankAccountName,
            //     amount: withdrawal.amount
            // })
            // 
            // if (transferResult.success) {
            //     withdrawal.status = WithdrawalStatus.COMPLETED
            //     withdrawal.transactionReference = transferResult.transactionId
            //     // Update user balance: move from pending to withdrawn
            //     const user = withdrawal.user
            //     user.pendingWithdrawal = Number(user.pendingWithdrawal || 0) - withdrawal.amount
            //     user.withdrawnAmount = Number(user.withdrawnAmount || 0) + withdrawal.amount
            //     await manager.save(user)
            //     await manager.save(withdrawal)
            // } else {
            //     withdrawal.status = WithdrawalStatus.FAILED
            //     await manager.save(withdrawal)
            // }
        })

        // Send notification to user via event (enables real-time socket notification)
        eventBus.emit(EVENTS.WITHDRAWAL, {
            userId: withdrawal.user.id,
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            status: WithdrawalStatus.PROCESSING
        })

        return this.sanitizeWithdrawal(withdrawal)
    }

    /**
     * Sanitize withdrawal to remove sensitive user fields
     */
    private sanitizeWithdrawal = (withdrawal: WithdrawalRequest) => {
        if (withdrawal.user) {
            const { password, tokens, ...safeUser } = withdrawal.user as any
            return {
                ...withdrawal,
                user: {
                    id: safeUser.id,
                    username: safeUser.username,
                    email: safeUser.email,
                    avatar: safeUser.avatar
                }
            }
        }
        return withdrawal
    }

    /**
     * Reject withdrawal request (Admin)
     */
    rejectWithdrawal = async (withdrawalId: number, adminId: number, reason?: string) => {
        const withdrawalRepo = await this.db.getRepository(WithdrawalRequest)
        const userRepo = await this.db.getRepository(User)

        const withdrawal = await withdrawalRepo.findOne({
            where: { id: withdrawalId },
            relations: ['user']
        })

        if (!withdrawal) {
            throw new NotFoundRequestError('Withdrawal request not found')
        }

        if (withdrawal.status !== WithdrawalStatus.PENDING) {
            throw new BadRequestError({ 
                message: `Cannot reject withdrawal with status: ${withdrawal.status}` 
            })
        }

        // Use transaction
        await this.db.dataSource.transaction(async (manager) => {
            withdrawal.status = WithdrawalStatus.REJECTED
            withdrawal.rejectionReason = reason
            withdrawal.processedBy = adminId
            await manager.save(withdrawal)

            // Return pending amount to user
            const user = withdrawal.user
            user.pendingWithdrawal = Number(user.pendingWithdrawal || 0) - Number(withdrawal.amount)
            await manager.save(user)
        })

        // Send notification to user via event (enables real-time socket notification)
        eventBus.emit(EVENTS.WITHDRAWAL, {
            userId: withdrawal.user.id,
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            status: WithdrawalStatus.REJECTED,
            reason
        })

        return this.sanitizeWithdrawal(withdrawal)
    }

    /**
     * Complete withdrawal (Admin) - after manual transfer
     */
    completeWithdrawal = async (withdrawalId: number, adminId: number, transactionReference?: string) => {
        const withdrawalRepo = await this.db.getRepository(WithdrawalRequest)
        const userRepo = await this.db.getRepository(User)

        const withdrawal = await withdrawalRepo.findOne({
            where: { id: withdrawalId },
            relations: ['user']
        })

        if (!withdrawal) {
            throw new NotFoundRequestError('Withdrawal request not found')
        }

        if (withdrawal.status !== WithdrawalStatus.PROCESSING) {
            throw new BadRequestError({ 
                message: `Cannot complete withdrawal with status: ${withdrawal.status}` 
            })
        }

        // Use transaction to update status and user balance
        await this.db.dataSource.transaction(async (manager) => {
            withdrawal.status = WithdrawalStatus.COMPLETED
            if (transactionReference) {
                withdrawal.transactionReference = transactionReference
            }
            withdrawal.processedBy = adminId
            await manager.save(withdrawal)

            // Update user balance: move from pending to withdrawn
            const user = withdrawal.user
            const currentPending = Number(user.pendingWithdrawal || 0)
            const currentWithdrawn = Number(user.withdrawnAmount || 0)
            
            user.pendingWithdrawal = Math.max(0, currentPending - Number(withdrawal.amount))
            user.withdrawnAmount = currentWithdrawn + Number(withdrawal.amount)
            await manager.save(user)
        })

        // Send notification to user via event (enables real-time socket notification)
        eventBus.emit(EVENTS.WITHDRAWAL, {
            userId: withdrawal.user.id,
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            status: WithdrawalStatus.COMPLETED,
            transactionReference
        })

        return this.sanitizeWithdrawal(withdrawal)
    }

    /**
     * Mark withdrawal as failed (Admin)
     */
    failWithdrawal = async (withdrawalId: number, adminId: number, reason?: string) => {
        const withdrawalRepo = await this.db.getRepository(WithdrawalRequest)
        const userRepo = await this.db.getRepository(User)

        const withdrawal = await withdrawalRepo.findOne({
            where: { id: withdrawalId },
            relations: ['user']
        })

        if (!withdrawal) {
            throw new NotFoundRequestError('Withdrawal request not found')
        }

        const currentStatus = withdrawal.status
        if (![WithdrawalStatus.PROCESSING, WithdrawalStatus.PENDING].includes(currentStatus)) {
            throw new BadRequestError({ 
                message: `Cannot fail withdrawal with status: ${currentStatus}` 
            })
        }

        // Use transaction to rollback
        await this.db.dataSource.transaction(async (manager) => {
            const user = withdrawal.user
            const currentPending = Number(user.pendingWithdrawal || 0)

            withdrawal.status = WithdrawalStatus.FAILED
            if (reason) {
                withdrawal.rejectionReason = reason
            }
            withdrawal.processedBy = adminId
            await manager.save(withdrawal)

            // Rollback user balance based on current status
            if (currentStatus === WithdrawalStatus.PROCESSING) {
                // Was processing but failed - unlock the pending amount
                // Note: withdrawnAmount should not have been increased yet (only on COMPLETED)
                user.pendingWithdrawal = Math.max(0, currentPending - Number(withdrawal.amount))
            } else if (currentStatus === WithdrawalStatus.PENDING) {
                // Was pending, just remove from pendingWithdrawal
                user.pendingWithdrawal = Math.max(0, currentPending - Number(withdrawal.amount))
            }
            await manager.save(user)
        })

        // Send notification to user via event (enables real-time socket notification)
        eventBus.emit(EVENTS.WITHDRAWAL, {
            userId: withdrawal.user.id,
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            status: WithdrawalStatus.FAILED,
            reason
        })

        return this.sanitizeWithdrawal(withdrawal)
    }
}

export const withdrawalService = new WithdrawalService()

