export enum UserStatus {
  ACTIVE = 'ACTIVE',         // Đang hoạt động bình thường
  INACTIVE = 'INACTIVE',     // Chưa kích hoạt (chưa verify email / mới đăng ký)
  SUSPENDED = 'SUSPENDED',   // Tạm khóa (có thời hạn)
  BANNED = 'BANNED',         // Bị khóa vĩnh viễn do vi phạm
  DELETED = 'DELETED'        // Đã xóa (soft delete)
}
