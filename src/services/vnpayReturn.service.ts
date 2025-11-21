import { DatabaseService } from './database.service'
import { UserStudySet } from '~/entities/userStudySet.entity'
import { StudySet } from '~/entities/studySet.entity'
import { Transaction } from '~/entities/transaction.entity'
import { RevenueSplit } from '~/entities/revenueSplit.entity'
import { BadRequestError } from '~/core/error.response'
import { verifyVNPayReturn } from '~/utils/vnpay'
import { TransactionStatus } from '~/enums/transactionStatus.enum'
import { EVENTS } from '~/events-handler/constants'
import eventBus from '~/events-handler/eventBus'
import { User } from '~/entities/user.entity'
import { calculateRevenueSplit, PLATFORM_FEE_PERCENTAGE } from '~/constants/revenue'

class VNPayReturnService {
    private db = DatabaseService.getInstance()

    /**
     * Parse orderId từ format: STUDYSET_{studySetId}_{userId}_{uuid}
     */
    parseOrderId(orderId: string): { studySetId: number; userId: number } | null {
        const parts = orderId.split('_')
        if (parts.length < 4 || parts[0] !== 'STUDYSET') {
            return null
        }

        const studySetId = parseInt(parts[1])
        const userId = parseInt(parts[2])

        if (isNaN(studySetId) || isNaN(userId)) {
            return null
        }

        return { studySetId, userId }
    }

    /**
     * Xử lý VNPay return callback
     */
    handleVNPayReturn = async (params: Record<string, string>) => {
        // Verify signature
        if (!verifyVNPayReturn(params)) {
            throw new BadRequestError({ message: 'Invalid VNPay signature' })
        }
        const responseCode = params['vnp_ResponseCode']
        const orderId = params['vnp_TxnRef']
        const amount = params['vnp_Amount']
        const transactionStatus = params['vnp_TransactionStatus']
        const vnpTransactionNo = params['vnp_TransactionNo']

        // Find transaction by orderId
        const transactionRepo = await this.db.getRepository(Transaction)
        const transaction = await transactionRepo.findOne({
            where: { orderId: orderId },
            relations: ['user', 'studySet', 'studySet.owner'],
        })

        if (!transaction) {
            throw new BadRequestError({ message: 'Transaction not found' })
        }

        // Update transaction with VNPay response data
        transaction.vnpTransactionNo = vnpTransactionNo
        transaction.vnpResponseCode = responseCode

        // Check if payment was successful
        // ResponseCode: '00' means success
        // TransactionStatus: '00' means success
        const isSuccess = responseCode === '00' && transactionStatus === '00'

        if (isSuccess) {
            transaction.status = TransactionStatus.SUCCESS
        } else {
            transaction.status = TransactionStatus.FAILED
        }
        await transactionRepo.save(transaction)
        // If payment failed, return early
        if (!isSuccess) {
            return {
                success: false,
                message: 'Payment failed',
                responseCode,
                transactionStatus,
                transactionId: transaction.id,
            }
        }

        // Parse orderId
        const orderInfo = this.parseOrderId(orderId)
        if (!orderInfo) {
            throw new BadRequestError({ message: 'Invalid order ID format' })
        }

        const { studySetId, userId } = orderInfo

        // Check study set exists
        const studySetRepo = await this.db.getRepository(StudySet)
        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
        })

        if (!studySet) {
            throw new BadRequestError({ message: 'Study set not found' })
        }
        // Check if already purchased
        const userStudySetRepo = await this.db.getRepository(UserStudySet)
        const existingPurchase = await userStudySetRepo.findOne({
            where: {
                user: { id: userId },
                studySet: { id: studySetId },
            },
        })

        if (existingPurchase) {
            return {
                success: true,
                message: 'Study set already purchased',
                studySetId,
                userId,
            }
        }
        // Verify amount
        const paidAmount = Number(amount) / 100 // VNPay returns amount in cents
        if (Math.abs(paidAmount - Number(studySet.price)) > 0.01) {
            throw new BadRequestError({ message: 'Amount mismatch' })
        }

        // Use transaction to ensure atomicity: purchase record + revenue split + owner earnings update
        const buyer = transaction.user as User
        const purchasedStudySet = transaction.studySet as StudySet
        const owner = purchasedStudySet.owner

        await this.db.dataSource.transaction(async (manager) => {
            // Create purchase record
            const userStudySet = manager.getRepository(UserStudySet).create({
                user: { id: userId } as any,
                studySet: { id: studySetId } as any,
                purchasePrice: paidAmount,
            })
            await manager.getRepository(UserStudySet).save(userStudySet)

            // Calculate and save revenue split (only if owner is different from buyer)
            if (owner && owner.id !== userId) {
                // Calculate revenue split: platform fee and owner earnings
                const revenueSplit = calculateRevenueSplit(paidAmount, PLATFORM_FEE_PERCENTAGE)

                // Check if revenue split already exists for this transaction (prevent duplicate)
                const existingRevenueSplit = await manager.getRepository(RevenueSplit).findOne({
                    where: {
                        transaction: { id: transaction.id }
                    }
                })

                if (!existingRevenueSplit) {
                    // Create revenue split record
                    const revenueSplitRecord = manager.getRepository(RevenueSplit).create({
                        transaction: { id: transaction.id } as any,
                        studySet: { id: studySetId } as any,
                        owner: { id: owner.id } as any,
                        totalAmount: revenueSplit.totalAmount,
                        ownerEarnings: revenueSplit.ownerEarnings,
                        platformFee: revenueSplit.platformFee,
                        platformFeePercentage: revenueSplit.platformFeePercentage,
                    })
                    await manager.getRepository(RevenueSplit).save(revenueSplitRecord)

                    // Update owner's total earnings
                    const ownerRecord = await manager.getRepository(User).findOne({
                        where: { id: owner.id }
                    })

                    if (ownerRecord) {
                        // Add to existing total earnings
                        ownerRecord.totalEarnings = Number(ownerRecord.totalEarnings || 0) + revenueSplit.ownerEarnings
                        await manager.getRepository(User).save(ownerRecord)
                    }
                }
            }
        })

        // Emit purchase event
        const ownerId = owner?.id
        if (buyer && ownerId) {
            eventBus.emit(EVENTS.ORDER, {
                buyer,
                studySetId,
                studySetOwnerId: ownerId,
                amount: paidAmount,
                isFree: false
            })
        }

        return {
            success: true,
            message: 'Purchase successful',
            studySetId,
            userId,
            amount: paidAmount,
            transactionId: transaction.id,
        }
    }
}

export const vnpayReturnService = new VNPayReturnService()

