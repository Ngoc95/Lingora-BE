import { WithdrawalStatus } from '../../../enums/withdrawalStatus.enum'

export interface UpdateWithdrawalBodyReq {
    status?: WithdrawalStatus
    rejectionReason?: string
    transactionReference?: string
}

