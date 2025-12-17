# Report Module Documentation

## 📋 Tổng quan

Module Report cho phép:
- **User**: Báo cáo vi phạm trên Post, Study Set, Comment
- **Admin**: Xem, phân loại, xử lý báo cáo và thực thi hành động

---

## 🔑 Enums

### ReportType (Loại vi phạm)
```
SPAM              - Spam, quảng cáo
HARASSMENT        - Quấy rối, bắt nạt
HATE_SPEECH       - Ngôn từ thù ghét
INAPPROPRIATE     - Nội dung không phù hợp
MISINFORMATION    - Thông tin sai lệch
COPYRIGHT         - Vi phạm bản quyền
VIOLENCE          - Bạo lực
ADULT_CONTENT     - Nội dung người lớn
OTHER             - Khác (user tự nhập lý do)
```

### TargetType (Loại nội dung)
```
POST
STUDY_SET
COMMENT
```

### ReportStatus (Trạng thái)
```
PENDING    - Chờ xử lý
ACCEPTED   - Đã chấp nhận (vi phạm)
REJECTED   - Đã từ chối (không vi phạm)
```

### ReportActionType (Hành động admin)
```
DELETE_CONTENT  - Xóa vĩnh viễn
WARN_USER       - Cảnh cáo user
SUSPEND_USER    - Tạm khóa (1-365 ngày)
BAN_USER        - Khóa vĩnh viễn
```

---

## 📊 Analytics & Statistics

### Dashboard Metrics
- Tổng số báo cáo (theo status)
- Báo cáo mới trong 24h
- Thời gian xử lý trung bình
- Tỷ lệ chấp nhận/từ chối

### Biểu đồ
- Báo cáo theo reportType (pie chart)
- Xu hướng báo cáo theo thời gian (line chart)
- Top users bị báo cáo nhiều nhất
- Top reporters (users báo cáo nhiều nhất)

### Filters cho Analytics
- Theo khoảng thời gian
- Theo reportType
- Theo targetType
- Theo admin xử lý

---

## 🔐 Permissions

### User (LEARNER role)
- ✅ Tạo báo cáo
- ❌ Xem danh sách báo cáo
- ❌ Xem chi tiết báo cáo
- ❌ Xử lý báo cáo

### Admin (ADMIN role)
- ✅ Tạo báo cáo
- ✅ Xem danh sách báo cáo
- ✅ Xem chi tiết báo cáo
- ✅ Xử lý báo cáo (accept/reject + actions)
- ✅ Xóa báo cáo

---
