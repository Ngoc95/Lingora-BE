export interface CreateWithdrawalBodyReq {
    amount: number
    bankName: string
    bankAccountNumber: string
    bankAccountName: string
    bankBranch?: string
}

