import swaggerUi from 'swagger-ui-express'
import type { Express } from 'express'
import type { OpenAPIV3 } from 'openapi-types'
import { schemas, responses } from '~/swagger/schemas'
import { allPaths } from '~/swagger/paths'

const swaggerSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',

  info: {
    title: 'Lingora API',
    version: '1.0.0',
    description: `
## Lingora — Nền tảng học tiếng Anh

REST API cho ứng dụng học tiếng Anh Lingora gồm các tính năng:
- **Xác thực**: Đăng ký, đăng nhập, Google OAuth, quản lý mật khẩu
- **Nội dung học**: Categories → Topics → Words (với SRS flashcard)
- **Kiểm tra**: Bài thi IELTS, adaptive test trình độ đầu vào
- **AI Chatbot**: RAG-powered chatbot hỗ trợ học tiếng Anh
- **AI Conversation**: Luyện hội thoại với AI, chấm điểm và phản hồi lỗi ngữ pháp
- **Study Sets**: Tạo và chia sẻ bộ flashcard + quiz
- **Classrooms**: Lớp học online với lessons, quizzes và realtime chat
- **Cộng đồng**: Diễn đàn bài viết, bình luận, like, báo cáo vi phạm
- **Xếp hạng**: Hệ thống XP, level và bảng xếp hạng theo kỳ
- **Thanh toán**: VNPay cho mua study set và rút tiền

### Xác thực

Hầu hết các endpoint yêu cầu **Bearer Token** trong header \`Authorization\`.

\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

Token có thể lấy từ \`POST /auth/login\` hoặc \`POST /auth/register\`.

### Base URL

| Môi trường | URL |
|---|---|
| Local | \`http://localhost:4000\` |
| Production | \`https://lingora-be-dxce.onrender.com\` |
    `.trim(),
    contact: {
      name: 'Lingora Team',
      email: '23521020@gm.uit.edu.vn',
    },
    license: {
      name: 'MIT',
    },
  },

  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local Development',
    },
    {
      url: 'https://lingora-be-dxce.onrender.com',
      description: 'Production',
    },
  ],

  tags: [
    { name: 'Auth', description: 'Đăng ký, đăng nhập, quản lý token và mật khẩu' },
    { name: 'Users', description: 'Quản lý người dùng (Admin)' },
    { name: 'Categories', description: 'Danh mục học tập (Admin)' },
    { name: 'Topics', description: 'Chủ đề trong danh mục (Admin)' },
    { name: 'Words', description: 'Từ vựng — CRUD và tra từ điển' },
    { name: 'Progress', description: 'Tiến độ học từ vựng theo SRS (User)' },
    { name: 'Study Sets', description: 'Bộ flashcard + quiz do người dùng tạo' },
    { name: 'Exams', description: 'Đề thi và lịch sử làm bài' },
    { name: 'Exams (Admin)', description: 'Quản lý đề thi (Admin)' },
    { name: 'Classrooms', description: 'Lớp học online — quản lý, thành viên và chat' },
    { name: 'Classrooms - Lessons', description: 'Lessons và flashcards trong classroom' },
    { name: 'Classrooms - Quizzes', description: 'Quizzes và câu hỏi trong classroom' },
    { name: 'Conversations', description: 'Luyện hội thoại tiếng Anh với AI' },
    { name: 'Community - Posts', description: 'Diễn đàn — bài viết' },
    { name: 'Community - Comments', description: 'Diễn đàn — bình luận' },
    { name: 'Community - Likes', description: 'Like bài viết, comment, study set' },
    { name: 'Community - Reports', description: 'Báo cáo nội dung vi phạm' },
    { name: 'Rankings', description: 'Hệ thống XP và bảng xếp hạng' },
    { name: 'Withdrawals', description: 'Yêu cầu rút tiền (User + Admin)' },
    { name: 'Notifications', description: 'Thông báo trong ứng dụng' },
    { name: 'Dashboard (Admin)', description: 'Phân tích và thống kê tổng quan (Admin)' },
    { name: 'AI Chatbot', description: 'Chatbot AI hỗ trợ học tiếng Anh (RAG)' },
    { name: 'Translate', description: 'Dịch thuật câu/đoạn văn' },
    { name: 'Upload', description: 'Upload ảnh, âm thanh và file lên Cloudinary' },
    { name: 'Payments (VNPay)', description: 'Xử lý thanh toán VNPay' },
    { name: 'Adaptive Test', description: 'Kiểm tra trình độ đầu vào thích nghi' },
  ],

  components: {
    schemas,
    responses,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token lấy từ `POST /auth/login` hoặc `POST /auth/register`',
      },
    },
  },

  paths: allPaths,
}

export function setupSwagger(app: Express): void {
  const options: swaggerUi.SwaggerUiOptions = {
    customSiteTitle: 'Lingora API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
    customCss: `
      .swagger-ui .topbar { background-color: #1a1a2e; }
      .swagger-ui .topbar-wrapper img { content: url(''); }
      .swagger-ui .topbar-wrapper::after { content: 'Lingora API'; color: white; font-weight: bold; font-size: 1.2rem; }
    `,
  }

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, options))

  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
}
