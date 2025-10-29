export enum UserStatus {
  ACTIVE = 'ACTIVE',         // Đang hoạt động bình thường
  INACTIVE = 'INACTIVE',     // Chưa kích hoạt (chưa verify email / mới đăng ký)
  BANNED = 'BANNED',         // Bị khóa do vi phạm
  DELETED = 'DELETED'        // Đã xóa (soft delete)
}
