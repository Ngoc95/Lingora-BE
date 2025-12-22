import { FindOptionsOrder } from 'typeorm'
import { WithdrawalRequest } from '~/entities/withdrawalRequest.entity'
import { WithdrawalStatus } from '~/enums/withdrawalStatus.enum'

export interface WithdrawalQueryReq {
    page?: number
    limit?: number
    status?: WithdrawalStatus
    userId?: number
    sort?: FindOptionsOrder<WithdrawalRequest>
}

