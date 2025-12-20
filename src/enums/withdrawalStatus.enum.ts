export enum WithdrawalStatus {
    PENDING = 'PENDING',        // Chờ admin xử lý
    PROCESSING = 'PROCESSING',   // Đang xử lý chuyển tiền
    COMPLETED = 'COMPLETED',     // Hoàn thành
    REJECTED = 'REJECTED',       // Từ chối
    FAILED = 'FAILED'           // Thất bại
}

