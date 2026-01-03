# Quản lý User - Tài liệu cho Frontend

## Tổng quan

Tài liệu hướng dẫn FE triển khai tính năng **Quản lý người dùng** (User Management) trong Admin panel, bao gồm chức năng **Ban/Suspend** user.

---

## 1. User Status Enum

```typescript
enum UserStatus {
  ACTIVE = 'ACTIVE',         // Đang hoạt động bình thường
  INACTIVE = 'INACTIVE',     // Chưa kích hoạt (chưa verify email / mới đăng ký)
  SUSPENDED = 'SUSPENDED',   // Tạm khóa (có thời hạn)
  BANNED = 'BANNED',         // Bị khóa vĩnh viễn do vi phạm
  DELETED = 'DELETED'        // Đã xóa (soft delete)
}
```

---

## 2. User Fields liên quan đến Ban/Suspend

| Field | Type | Mô tả |
|-------|------|-------|
| `status` | `UserStatus` | Trạng thái hiện tại của user |
| `suspendedUntil` | `Date \| null` | Thời điểm hết hạn tạm khóa (chỉ cho SUSPENDED) |
| `banReason` | `string \| null` | Lý do bị khóa |

---

## 3. API Quản lý User

### 3.1. Lấy danh sách Users

```
GET /users
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
| Parameter | Type | Mô tả |
|-----------|------|-------|
| `page` | number | Trang hiện tại (default: 1) |
| `limit` | number | Số lượng mỗi trang (default: 20) |
| `search` | string | Tìm theo username hoặc email |
| `proficiency` | string | Lọc: `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `status` | UserStatus | Lọc: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `BANNED`, `DELETED` |
| `sort` | string | `+id`, `-id`, `+username`, `-username`, `+email`, `-email`, `+createdAt`, `-createdAt` |

**Response:**
```json
{
  "currentPage": 1,
  "totalPages": 5,
  "total": 100,
  "users": [
    {
      "id": 1,
      "username": "user123",
      "email": "user@example.com",
      "avatar": "...",
      "roles": [...],
      "proficiency": "INTERMEDIATE",
      "status": "ACTIVE"
    }
  ]
}
```

---

### 3.2. Lấy thông tin User theo ID

```
GET /users/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

---

### 3.3. Tạo User mới

```
POST /users
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permission Required:** `createAny` trên Resource `USER`

**Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "Password123",
  "avatar": "https://...",
  "roleIds": [1, 2],
  "proficiency": "BEGINNER"
}
```

---

### 3.4. Cập nhật User (bao gồm Ban/Suspend)

```
PATCH /users/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body Parameters:**
| Parameter | Type | Mô tả |
|-----------|------|-------|
| `username` | string | (optional) |
| `email` | string | (optional) |
| `newPassword` | string | (optional, cần `oldPassword`) |
| `oldPassword` | string | (optional) |
| `avatar` | string | (optional) |
| `roleIds` | number[] | (optional) |
| `proficiency` | string | (optional) `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `status` | UserStatus | (optional) `ACTIVE`, `INACTIVE`, `SUSPENDED`, `BANNED`, `DELETED` |
| `banReason` | string \| null | (optional) Lý do ban/suspend, gửi `null` để xóa |
| `suspendedUntil` | Date \| null | (optional) Thời gian hết hạn suspend, gửi `null` để xóa |

---

#### Ví dụ 1: Ban user vĩnh viễn
```json
PATCH /users/123
{
  "status": "BANNED",
  "banReason": "Vi phạm quy định cộng đồng nghiêm trọng"
}
```

---

#### Ví dụ 2: Suspend user 7 ngày
```json
PATCH /users/123
{
  "status": "SUSPENDED",
  "banReason": "Vi phạm quy định lần thứ 2",
  "suspendedUntil": "2025-01-04T00:00:00.000Z"
}
```

> 💡 **Tip:** FE tính `suspendedUntil` = `new Date()` + số ngày suspend

---

#### Ví dụ 3: Unban/Unsuspend user
```json
PATCH /users/123
{
  "status": "ACTIVE",
  "banReason": null,
  "suspendedUntil": null
}
```

---

### 3.5. Restore User đã xóa

```
PATCH /users/restore/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

---

### 3.6. Xóa User

```
DELETE /users/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permission Required:** `deleteAny` trên Resource `USER`

---

## 4. Hệ thống Validation Status (Backend đã xử lý)

Khi user bị BANNED/SUSPENDED cố gắng đăng nhập hoặc gọi API:

| Status | Message trả về |
|--------|----------------|
| `BANNED` | `"Tài khoản của bạn đã bị khóa vĩnh viễn. Lý do: {banReason}"` |
| `SUSPENDED` | `"Tài khoản của bạn đã bị tạm khóa đến {dd/MM/yyyy}. Lý do: {banReason}"` |
| `DELETED` | `"Tài khoản không tồn tại"` |

> ✅ **Auto-unban:** Khi `suspendedUntil` hết hạn, backend tự động chuyển status về `ACTIVE`.

---

## 5. Gợi ý UI cho Frontend

### 5.1. Trang Quản lý User

**Bộ lọc:**
- Dropdown lọc theo Status: `Tất cả`, `Hoạt động`, `Chưa kích hoạt`, `Đã tạm khóa`, `Đã khóa`, `Đã xóa`
- Ô tìm kiếm: username hoặc email
- Dropdown trình độ: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`

**Bảng danh sách User:**
| Column | Mô tả |
|--------|-------|
| Avatar | Ảnh đại diện |
| Username | Tên người dùng |
| Email | Email |
| Trình độ | BEGINNER / INTERMEDIATE / ADVANCED |
| Trạng thái | Badge với màu |
| Actions | Nút: Xem, Sửa, Ban/Unban, Xóa/Restore |

### 5.2. Status Badge Colors

```css
.status-active { background: #22c55e; color: white; }     /* Xanh lá */
.status-inactive { background: #eab308; color: white; }   /* Vàng */
.status-suspended { background: #f97316; color: white; }  /* Cam */
.status-banned { background: #ef4444; color: white; }     /* Đỏ */
.status-deleted { background: #6b7280; color: white; }    /* Xám */
```

### 5.3. Modal Ban User

```
┌─────────────────────────────────────┐
│ 🔴 Khóa tài khoản vĩnh viễn         │
├─────────────────────────────────────┤
│ User: @username                     │
│                                     │
│ Lý do khóa: *                       │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⚠️ User sẽ không thể đăng nhập     │
│                                     │
│        [Hủy]    [Xác nhận khóa]    │
└─────────────────────────────────────┘
```

### 5.4. Modal Suspend User

```
┌─────────────────────────────────────┐
│ 🟠 Tạm khóa tài khoản               │
├─────────────────────────────────────┤
│ User: @username                     │
│                                     │
│ Lý do tạm khóa: *                   │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Thời gian tạm khóa: *               │
│ ○ 7 ngày  ○ 14 ngày  ○ 30 ngày     │
│ ○ Tùy chọn: [___] ngày              │
│                                     │
│        [Hủy]    [Xác nhận]         │
└─────────────────────────────────────┘
```

---

## 6. Tóm tắt API

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/users` | Lấy danh sách users |
| `GET` | `/users/:id` | Lấy user theo ID |
| `POST` | `/users` | Tạo user mới |
| `PATCH` | `/users/:id` | Cập nhật user (bao gồm ban/suspend) |
| `PATCH` | `/users/restore/:id` | Restore user đã xóa |
| `DELETE` | `/users/:id` | Xóa user |

---

## 7. Checklist Frontend

- [ ] Hiển thị danh sách users với filter status
- [ ] Hiển thị badge trạng thái với màu sắc
- [ ] Modal Ban User (gửi `status: "BANNED"` + `banReason`)
- [ ] Modal Suspend User (gửi `status: "SUSPENDED"` + `banReason` + `suspendedUntil`)
- [ ] Nút Unban cho user đang bị khóa (gửi `status: "ACTIVE"` + `banReason: null`)
- [ ] Nút Restore cho user đã xóa

---

*Cập nhật: 28/12/2024*
