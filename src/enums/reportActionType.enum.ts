export enum ReportActionType {
    DELETE_CONTENT = 'DELETE_CONTENT', // Soft delete
    WARN_USER = 'WARN_USER',            // Cảnh cáo người dùng
    SUSPEND_USER = 'SUSPEND_USER',      // Tạm khóa tài khoản
    BAN_USER = 'BAN_USER'               // Khóa vĩnh viễn
}
