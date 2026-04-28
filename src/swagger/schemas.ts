import type { OpenAPIV3 } from 'openapi-types'

export const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  // ──────────────── Common ────────────────
  PaginationMeta: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 100 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 10 },
      totalPages: { type: 'integer', example: 10 },
    },
  },

  ApiError: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Bad Request' },
      errors: { type: 'array', items: { type: 'object' } },
    },
  },

  // ──────────────── Auth ────────────────
  // POST /auth/register
  RegisterBody: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', example: 'john_doe' },
      email: { type: 'string', format: 'email', example: 'john@example.com' },
      password: { type: 'string', format: 'password', minLength: 6, example: 'password123' },
    },
  },

  // POST /auth/login — identifier = email hoặc username
  LoginBody: {
    type: 'object',
    required: ['identifier', 'password'],
    properties: {
      identifier: { type: 'string', example: 'User001', description: 'Email hoặc username' },
      password: { type: 'string', format: 'password', example: 'User123' },
    },
  },

  // POST /auth/google
  GoogleAuthBody: {
    type: 'object',
    required: ['idToken'],
    properties: {
      idToken: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ii...' },
    },
  },

  // POST /auth/refresh-token
  RefreshTokenBody: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' },
    },
  },

  UserProfile: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      username: { type: 'string', example: 'john_doe' },
      email: { type: 'string', format: 'email', example: 'john@example.com' },
      avatar: { type: 'string', nullable: true, example: 'https://res.cloudinary.com/...' },
      isVerified: { type: 'boolean', example: false },
      proficiency: {
        type: 'string',
        enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        nullable: true,
      },
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'] },
      roles: { type: 'array', items: { type: 'string' }, example: ['user'] },
      balance: { type: 'number', example: 0 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  AuthResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Login successful' },
      data: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          user: { $ref: '#/components/schemas/UserProfile' },
        },
      },
    },
  },

  // ──────────────── Users ────────────────
  // POST /users — CreateUserBodyReq
  CreateUserBody: {
    type: 'object',
    required: ['username', 'email', 'password', 'roleIds'],
    properties: {
      username: { type: 'string', example: 'teacher_john' },
      email: { type: 'string', format: 'email', example: 'teacher@example.com' },
      password: { type: 'string', format: 'password', minLength: 6 },
      avatar: { type: 'string', nullable: true, description: 'URL from upload endpoint' },
      roleIds: { type: 'array', items: { type: 'integer' }, example: [2] },
      proficiency: {
        type: 'string',
        enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        nullable: true,
      },
    },
  },

  // PATCH /users/:id — UpdateUserBodyReq
  UpdateUserBody: {
    type: 'object',
    properties: {
      username: { type: 'string' },
      email: { type: 'string', format: 'email' },
      newPassword: { type: 'string', format: 'password' },
      oldPassword: { type: 'string', format: 'password', description: 'Bắt buộc khi đổi mật khẩu' },
      avatar: { type: 'string', nullable: true },
      roleIds: { type: 'array', items: { type: 'integer' } },
      proficiency: {
        type: 'string',
        enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        nullable: true,
      },
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'] },
    },
  },

  // ──────────────── Categories ────────────────
  // POST/PATCH /categories — CreateCategoryBodyReq / UpdateCategoryBodyReq
  CategoryBody: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Business English' },
      description: { type: 'string', nullable: true, example: 'English for business communication' },
    },
  },

  Category: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      name: { type: 'string', example: 'Business English' },
      description: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  // ──────────────── Topics ────────────────
  // POST/PATCH /topics — CreateTopicBodyReq / UpdateTopicBodyReq
  TopicBody: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Meeting Vocabulary' },
      description: { type: 'string', nullable: true },
      categoryId: { type: 'integer', nullable: true, example: 1 },
    },
  },

  Topic: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      name: { type: 'string', example: 'Meeting Vocabulary' },
      description: { type: 'string', nullable: true },
      categoryId: { type: 'integer', nullable: true },
      wordCount: { type: 'integer', example: 30 },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  // ──────────────── Words ────────────────
  // POST/PATCH /words — CreateWordBodyReq / UpdateWordBodyReq
  WordBody: {
    type: 'object',
    required: ['word', 'meaning'],
    properties: {
      word: { type: 'string', example: 'collaborate' },
      meaning: { type: 'string', example: 'to work jointly on an activity or project' },
      vnMeaning: { type: 'string', nullable: true, example: 'hợp tác' },
      phonetic: { type: 'string', nullable: true, example: '/kəˈlæbəreɪt/' },
      cefrLevel: {
        type: 'string',
        enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        nullable: true,
      },
      type: {
        type: 'string',
        enum: ['noun','verb','adjective','adverb','phrase','preposition','conjunction','interjection','pronoun','determiner','article','numeral','unknown'],
        nullable: true,
      },
      example: { type: 'string', nullable: true, example: 'We need to collaborate more effectively.' },
      exampleTranslation: { type: 'string', nullable: true },
      audioUrl: { type: 'string', nullable: true },
      imageUrl: { type: 'string', nullable: true },
      topicId: { type: 'integer', nullable: true, example: 1 },
    },
  },

  Word: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      word: { type: 'string', example: 'collaborate' },
      meaning: { type: 'string' },
      vnMeaning: { type: 'string', nullable: true },
      phonetic: { type: 'string', nullable: true },
      cefrLevel: { type: 'string', enum: ['A1','A2','B1','B2','C1','C2'], nullable: true },
      type: {
        type: 'string',
        enum: ['noun','verb','adjective','adverb','phrase','preposition','conjunction','interjection','pronoun','determiner','article','numeral','unknown'],
        nullable: true,
      },
      example: { type: 'string', nullable: true },
      exampleTranslation: { type: 'string', nullable: true },
      audioUrl: { type: 'string', nullable: true },
      imageUrl: { type: 'string', nullable: true },
      topicId: { type: 'integer', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  // ──────────────── Study Sets ────────────────
  // FlashcardInputReq
  FlashcardInput: {
    type: 'object',
    required: ['frontText', 'backText'],
    properties: {
      frontText: { type: 'string', example: 'collaborate' },
      backText: { type: 'string', example: 'hợp tác' },
      example: { type: 'string', nullable: true },
      audioUrl: { type: 'string', nullable: true },
      imageUrl: { type: 'string', nullable: true },
    },
  },

  // QuizInputReq — type + question + options + correctAnswer (string, not index)
  QuizInput: {
    type: 'object',
    required: ['type', 'question', 'options', 'correctAnswer'],
    properties: {
      type: {
        type: 'string',
        enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'],
      },
      question: { type: 'string', example: 'What does "collaborate" mean?' },
      options: {
        type: 'array',
        items: { type: 'string' },
        example: ['hợp tác', 'phân chia', 'từ chối', 'chấp nhận'],
      },
      correctAnswer: { type: 'string', example: 'hợp tác', description: 'Giá trị đúng trong mảng options' },
    },
  },

  // CreateStudySetBodyReq
  CreateStudySetBody: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', example: 'Business Vocabulary' },
      description: { type: 'string', nullable: true },
      visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE'], default: 'PRIVATE' },
      price: { type: 'number', nullable: true, example: 0, description: 'Price in VND; 0 = free' },
      flashcards: {
        type: 'array',
        items: { $ref: '#/components/schemas/FlashcardInput' },
      },
      quizzes: {
        type: 'array',
        items: { $ref: '#/components/schemas/QuizInput' },
      },
    },
  },

  // BuyStudySetBodyReq — POST /studysets/:id/buy
  BuyStudySetBody: {
    type: 'object',
    properties: {
      bankCode: { type: 'string', nullable: true, example: 'NCB', description: 'Mã ngân hàng VNPay (tuỳ chọn)' },
      returnUrl: { type: 'string', nullable: true, description: 'Override URL redirect sau thanh toán' },
      locale: { type: 'string', enum: ['vn', 'en'], nullable: true, default: 'vn' },
    },
  },

  // ──────────────── Posts ────────────────
  // CreatePostBodyReq
  CreatePostBody: {
    type: 'object',
    required: ['title', 'content', 'topic'],
    properties: {
      title: { type: 'string', maxLength: 128, example: 'Tips for IELTS Writing' },
      content: { type: 'string', example: 'Here are some useful tips...' },
      topic: {
        type: 'string',
        enum: ['general','grammar','vocabulary','listening','speaking','reading','writing'],
        example: 'writing',
      },
      thumbnails: { type: 'array', items: { type: 'string' }, description: 'Array of image URLs' },
      tags: { type: 'array', items: { type: 'string' }, example: ['ielts', 'writing'] },
    },
  },

  // UpdatePostBodyReq
  UpdatePostBody: {
    type: 'object',
    properties: {
      title: { type: 'string', maxLength: 128 },
      content: { type: 'string' },
      topic: {
        type: 'string',
        enum: ['general','grammar','vocabulary','listening','speaking','reading','writing'],
      },
      thumbnails: { type: 'array', items: { type: 'string' } },
      tags: { type: 'array', items: { type: 'string' } },
      status: { type: 'string', enum: ['PUBLISHED', 'ARCHIVED', 'DELETED'] },
    },
  },

  // ──────────────── Comments ────────────────
  // CreateCommentBodyReq — body fields exposed qua HTTP (user + targetId lấy từ token/param)
  CreateCommentBody: {
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', maxLength: 256, example: 'Great post! Very helpful.' },
      parentId: {
        type: 'integer',
        nullable: true,
        description: 'null cho top-level comment, ID của comment cha cho nested reply',
      },
    },
  },

  // ──────────────── Reports ────────────────
  // CreateReportBodyReq — có thêm reportType
  CreateReportBody: {
    type: 'object',
    required: ['targetType', 'targetId', 'reportType', 'reason'],
    properties: {
      targetType: { type: 'string', enum: ['POST', 'STUDY_SET', 'COMMENT'] },
      targetId: { type: 'integer', example: 1 },
      reportType: {
        type: 'string',
        enum: ['SPAM','HARASSMENT','HATE_SPEECH','INAPPROPRIATE','MISINFORMATION','COPYRIGHT','VIOLENCE','ADULT_CONTENT','OTHER'],
      },
      reason: { type: 'string', maxLength: 500, example: 'This content contains inappropriate language.' },
    },
  },

  // UpdateReportStatusBodyReq
  UpdateReportStatusBody: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['ACCEPTED', 'REJECTED'] },
    },
  },

  // HandleReportBodyReq — actions là mảng (không phải object đơn)
  HandleReportBody: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['ACCEPTED', 'REJECTED'] },
      actions: {
        type: 'array',
        nullable: true,
        description: 'Hành động xử lý — có thể thực hiện nhiều hành động cùng lúc',
        items: {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['DELETE_CONTENT', 'HIDE_CONTENT', 'WARN_USER', 'SUSPEND_USER', 'BAN_USER'],
            },
            reason: { type: 'string', nullable: true },
            duration: {
              type: 'integer',
              nullable: true,
              description: 'SUSPEND_USER: số ngày tạm khóa (1–365)',
            },
          },
        },
      },
    },
  },

  // ──────────────── Conversations ────────────────
  // CreateSessionDto — chỉ có contextId, không có difficulty
  CreateSessionBody: {
    type: 'object',
    required: ['contextId'],
    properties: {
      contextId: { type: 'integer', example: 1, description: 'ID của ConversationContext (chủ đề hội thoại)' },
    },
  },

  // SendMessageDto — field là question (không phải message)
  SendMessageBody: {
    type: 'object',
    required: ['question'],
    properties: {
      question: {
        type: 'string',
        maxLength: 1000,
        example: "Hello! I'd like to practice ordering food at a restaurant.",
      },
    },
  },

  ConversationMessage: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      role: { type: 'string', enum: ['user', 'assistant'] },
      content: { type: 'string' },
      errors: { type: 'array', items: { type: 'object' }, description: 'Lỗi ngữ pháp/từ vựng được phát hiện' },
      suggestions: { type: 'array', items: { type: 'string' }, description: 'Gợi ý câu tiếp theo' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  // ──────────────── Classrooms ────────────────
  // CreateClassroomBodyReq / UpdateClassroomBodyReq
  CreateClassroomBody: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'IELTS Preparation Class' },
      description: { type: 'string', nullable: true },
      coverImageUrl: { type: 'string', nullable: true, description: 'URL ảnh bìa lớp học' },
      maxStudents: { type: 'integer', nullable: true, example: 50 },
      status: {
        type: 'string',
        enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
        default: 'DRAFT',
      },
      isPublic: { type: 'boolean', default: true },
      settings: {
        type: 'object',
        nullable: true,
        description: 'Tuỳ chọn cấu hình lớp học (key-value)',
        additionalProperties: true,
      },
    },
  },

  // JoinClassroomBodyReq
  JoinClassroomBody: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string', example: 'ABC123', description: 'Mã tham gia lớp học do giáo viên cung cấp' },
    },
  },

  // CreateLessonBodyReq
  CreateLessonBody: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', example: 'Unit 1: Greetings' },
      description: { type: 'string', nullable: true },
      lessonType: {
        type: 'string',
        enum: ['VIDEO', 'STUDYSET', 'TEXT', 'MIXED'],
        nullable: true,
      },
      content: { type: 'string', nullable: true, description: 'Nội dung văn bản của lesson (HTML hoặc Markdown)' },
      sortOrder: { type: 'integer', nullable: true, example: 1 },
      isPublished: { type: 'boolean', default: false },
      scheduledAt: { type: 'string', format: 'date-time', nullable: true, description: 'Lịch phát hành lesson' },
    },
  },

  // CreateLessonFlashcardBodyReq
  CreateLessonFlashcardBody: {
    type: 'object',
    required: ['frontText', 'backText'],
    properties: {
      frontText: { type: 'string', example: 'collaborate' },
      backText: { type: 'string', example: 'hợp tác' },
      example: { type: 'string', nullable: true },
      audioUrl: { type: 'string', nullable: true },
      imageUrl: { type: 'string', nullable: true },
    },
  },

  // CreateClassroomQuizBodyReq
  CreateClassroomQuizBody: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', example: 'Week 1 Quiz' },
      description: { type: 'string', nullable: true },
      lessonId: { type: 'integer', nullable: true, description: 'Gắn quiz với lesson' },
      timeLimitSeconds: { type: 'integer', nullable: true, example: 1800, description: 'Giới hạn thời gian làm bài (giây)' },
      maxAttempts: { type: 'integer', nullable: true, example: 3, description: 'Số lần làm tối đa; null = không giới hạn' },
      passingScore: { type: 'number', nullable: true, example: 70, description: 'Điểm tối thiểu để đạt (0–100)' },
      isPublished: { type: 'boolean', default: false },
      opensAt: { type: 'string', format: 'date-time', nullable: true },
      closesAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },

  // CreateClassroomQuizQuestionBodyReq
  CreateClassroomQuizQuestionBody: {
    type: 'object',
    required: ['type', 'question', 'options', 'correctAnswer'],
    properties: {
      type: {
        type: 'string',
        enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'],
      },
      question: { type: 'string', example: 'What is the meaning of "collaborate"?' },
      options: {
        type: 'array',
        items: { type: 'string' },
        example: ['hợp tác', 'cạnh tranh', 'từ chối', 'đồng ý'],
      },
      correctAnswer: { type: 'string', example: 'hợp tác', description: 'Đáp án đúng (phải khớp với một giá trị trong options)' },
      explanation: { type: 'string', nullable: true },
    },
  },

  // SubmitQuizAttemptBodyReq — answers là map { questionId: answer }
  SubmitQuizAttemptBody: {
    type: 'object',
    required: ['answers'],
    properties: {
      answers: {
        type: 'object',
        additionalProperties: { type: 'string' },
        example: { '1': 'hợp tác', '2': 'TRUE', '3': 'verb' },
        description: 'Map từ questionId (string) sang đáp án đã chọn',
      },
    },
  },

  // ──────────────── Rankings ────────────────
  // AdjustXpBodyReq
  AdjustXpBody: {
    type: 'object',
    required: ['userId', 'xpAmount'],
    properties: {
      userId: { type: 'integer', example: 1 },
      xpAmount: { type: 'integer', example: 100, description: 'Dương để thêm XP, âm để trừ XP' },
      classroomId: { type: 'integer', nullable: true },
      description: { type: 'string', nullable: true, example: 'Reward for participation' },
    },
  },

  // ──────────────── Withdrawals ────────────────
  // CreateWithdrawalBodyReq
  CreateWithdrawalBody: {
    type: 'object',
    required: ['amount', 'bankName', 'bankAccountNumber', 'bankAccountName'],
    properties: {
      amount: { type: 'number', example: 100000, description: 'Số tiền rút (VND)' },
      bankName: { type: 'string', example: 'Vietcombank' },
      bankAccountNumber: { type: 'string', example: '1234567890' },
      bankAccountName: { type: 'string', example: 'NGUYEN VAN A' },
      bankBranch: { type: 'string', nullable: true, example: 'Chi nhánh Hà Nội' },
    },
  },

  // UpdateWithdrawalBodyReq — dùng cho reject / complete / fail
  UpdateWithdrawalBody: {
    type: 'object',
    properties: {
      rejectionReason: { type: 'string', nullable: true, description: 'Lý do từ chối (dùng cho reject)' },
      transactionReference: { type: 'string', nullable: true, description: 'Mã giao dịch ngân hàng (dùng cho complete)' },
    },
  },

  // ──────────────── Translate ────────────────
  // TranslatePhraseBodyReq — sourceLang / targetLang (không phải from/to)
  TranslatePhraseBody: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', example: 'The weather is beautiful today.' },
      sourceLang: { type: 'string', nullable: true, example: 'en', description: 'Ngôn ngữ nguồn; bỏ trống để tự động nhận diện' },
      targetLang: { type: 'string', nullable: true, example: 'vi', default: 'vi' },
    },
  },

  // ──────────────── AI Chatbot ────────────────
  // SendChatMessageBodyReq — field là question (không phải message)
  SendChatBody: {
    type: 'object',
    required: ['question'],
    properties: {
      question: { type: 'string', example: 'What is the difference between "affect" and "effect"?' },
      sessionId: {
        type: 'string',
        nullable: true,
        description: 'Tiếp tục session hiện có; bỏ trống để tạo session mới',
      },
    },
  },

  // ──────────────── Exams ────────────────
  // StartExamAttemptBodyReq — POST /exams/:examId/start
  StartExamAttemptBody: {
    type: 'object',
    required: ['mode'],
    properties: {
      mode: {
        type: 'string',
        enum: ['FULL', 'SECTION'],
        description: 'FULL: làm toàn bộ đề; SECTION: chỉ làm một section',
      },
      sectionId: {
        type: 'integer',
        nullable: true,
        description: 'Bắt buộc khi mode = SECTION',
      },
      resumeLast: {
        type: 'boolean',
        nullable: true,
        description: 'Tiếp tục attempt dở dang nếu có',
      },
    },
  },

  // SubmitExamSectionBodyReq — answers là array
  SubmitExamSectionBody: {
    type: 'object',
    required: ['answers'],
    properties: {
      answers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['questionId', 'answer'],
          properties: {
            questionId: { type: 'integer', example: 1 },
            answer: { description: 'Câu trả lời (string, array tuỳ loại câu hỏi)' },
          },
        },
      },
    },
  },

  // UpdateExamBodyReq — PATCH /admin/exams/:examId
  UpdateExamBody: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      thumbnailUrl: { type: 'string', nullable: true },
      isPublished: { type: 'boolean' },
      code: { type: 'string', description: 'Mã đề thi duy nhất' },
      examType: { type: 'string', enum: ['IELTS', 'TOEIC', 'TOEFL', 'CUSTOM'] },
      metadata: { type: 'object', nullable: true, additionalProperties: true },
    },
  },

  // ImportExamBodyReq — POST /admin/exams/import (nested structure)
  ImportExamBody: {
    type: 'object',
    required: ['examType', 'code', 'title', 'sections'],
    properties: {
      examType: { type: 'string', enum: ['IELTS', 'TOEIC', 'TOEFL', 'CUSTOM'] },
      code: { type: 'string', example: 'IELTS-2024-001', description: 'Mã đề thi duy nhất' },
      title: { type: 'string', example: 'IELTS Practice Test 1' },
      description: { type: 'string', nullable: true },
      totalDurationSeconds: { type: 'integer', nullable: true, example: 10800, description: 'Tổng thời gian làm bài (giây)' },
      thumbnailUrl: { type: 'string', nullable: true },
      isPublished: { type: 'boolean', default: false },
      metadata: { type: 'object', nullable: true, additionalProperties: true },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          required: ['sectionType', 'title', 'groups'],
          properties: {
            sectionType: {
              type: 'string',
              enum: ['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'GENERAL'],
            },
            title: { type: 'string', example: 'Reading Section' },
            displayOrder: { type: 'integer', nullable: true },
            durationSeconds: { type: 'integer', nullable: true, example: 3600 },
            instructions: { type: 'string', nullable: true },
            audioUrl: { type: 'string', nullable: true },
            metadata: { type: 'object', nullable: true, additionalProperties: true },
            groups: {
              type: 'array',
              items: {
                type: 'object',
                required: ['groupType', 'title', 'questionGroups'],
                properties: {
                  groupType: {
                    type: 'string',
                    enum: ['LISTENING_PART', 'PASSAGE', 'WRITING_TASK', 'SPEAKING_PART', 'GENERAL'],
                  },
                  title: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  content: { type: 'string', nullable: true, description: 'Đoạn văn / transcript / prompt' },
                  resourceUrl: { type: 'string', nullable: true },
                  displayOrder: { type: 'integer', nullable: true },
                  metadata: { type: 'object', nullable: true, additionalProperties: true },
                  questionGroups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['title', 'questions'],
                      properties: {
                        title: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        content: { type: 'string', nullable: true },
                        resourceUrl: { type: 'string', nullable: true },
                        metadata: { type: 'object', nullable: true, additionalProperties: true },
                        questions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            required: ['questionType', 'prompt'],
                            properties: {
                              questionType: {
                                type: 'string',
                                enum: ['MULTIPLE_CHOICE','SHORT_ANSWER','MATCHING','ESSAY','SPEAKING_PROMPT','TRUE_FALSE_NOT_GIVEN','FILL_IN_THE_BLANK','ORDERING','YES_NO_NOT_GIVEN','DIAGRAM_LABELING','TABLE_COMPLETION','FLOWCHART_COMPLETION','NOTE_COMPLETION'],
                              },
                              prompt: { type: 'string' },
                              options: {
                                type: 'array',
                                nullable: true,
                                items: {},
                                description: 'Các lựa chọn (string hoặc object tuỳ loại câu hỏi)',
                              },
                              correctAnswer: { nullable: true, description: 'Đáp án đúng' },
                              explanation: { type: 'string', nullable: true },
                              scoreWeight: { type: 'number', nullable: true, default: 1 },
                              metadata: { type: 'object', nullable: true, additionalProperties: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // ──────────────── Adaptive Test ────────────────
  // AdaptiveTestProgressBodyReq — POST /adaptive-test/next
  AdaptiveTestNextBody: {
    type: 'object',
    required: ['answeredQuestions'],
    properties: {
      answeredQuestions: {
        type: 'array',
        description: 'Danh sách câu hỏi đã trả lời (trống nếu là câu đầu tiên)',
        items: {
          type: 'object',
          required: ['questionId', 'answer'],
          properties: {
            questionId: { type: 'integer', example: 1 },
            answer: { type: 'string', example: 'A', description: 'Đáp án đã chọn' },
          },
        },
      },
    },
  },
}

export const responses: Record<string, OpenAPIV3.ResponseObject> = {
  Unauthorized: {
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        example: { message: 'Unauthorized' },
      },
    },
  },
  Forbidden: {
    description: 'Insufficient permissions',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        example: { message: 'Forbidden' },
      },
    },
  },
  NotFound: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        example: { message: 'Not found' },
      },
    },
  },
  BadRequest: {
    description: 'Validation error or bad request',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  },
}
