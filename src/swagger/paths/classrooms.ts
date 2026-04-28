import type { OpenAPIV3 } from 'openapi-types'

const auth = [{ bearerAuth: [] }]
const idParam: OpenAPIV3.ParameterObject = { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Classroom ID' }

export const classroomsPaths: OpenAPIV3.PathsObject = {
  // ══════════════════ CLASSROOM CRUD ══════════════════
  '/classrooms': {
    post: {
      tags: ['Classrooms'],
      summary: 'Tạo classroom mới (Teacher)',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateClassroomBody' } },
        },
      },
      responses: {
        '201': { description: 'Classroom được tạo' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    get: {
      tags: ['Classrooms'],
      summary: 'Lấy danh sách classrooms',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'isPublic', in: 'query', schema: { type: 'boolean' } },
        { name: 'sort', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Danh sách classrooms',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/classrooms/join': {
    post: {
      tags: ['Classrooms'],
      summary: 'Tham gia classroom bằng mã code',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/JoinClassroomBody' } },
        },
      },
      responses: {
        '200': { description: 'Yêu cầu tham gia đã được gửi hoặc đã vào thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/classrooms/{id}': {
    get: {
      tags: ['Classrooms'],
      summary: 'Lấy chi tiết classroom (Member)',
      security: auth,
      parameters: [idParam],
      responses: {
        '200': { description: 'Chi tiết classroom' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    patch: {
      tags: ['Classrooms'],
      summary: 'Cập nhật classroom (Teacher)',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateClassroomBody' } },
        },
      },
      responses: {
        '200': { description: 'Cập nhật thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Classrooms'],
      summary: 'Xoá classroom (Teacher)',
      security: auth,
      parameters: [idParam],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ MEMBERS ══════════════════
  '/classrooms/{id}/members': {
    get: {
      tags: ['Classrooms'],
      summary: 'Lấy danh sách thành viên (Member)',
      security: auth,
      parameters: [idParam],
      responses: {
        '200': { description: 'Danh sách thành viên' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/members/{memberId}/approve': {
    patch: {
      tags: ['Classrooms'],
      summary: 'Duyệt thành viên vào classroom (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'memberId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Thành viên đã được duyệt' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/classrooms/{id}/members/{memberId}': {
    delete: {
      tags: ['Classrooms'],
      summary: 'Kick thành viên ra khỏi classroom (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'memberId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Đã kick thành viên' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ LESSONS ══════════════════
  '/classrooms/{id}/lessons': {
    post: {
      tags: ['Classrooms - Lessons'],
      summary: 'Tạo lesson mới trong classroom (Teacher)',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateLessonBody' } },
        },
      },
      responses: {
        '201': { description: 'Lesson được tạo thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    get: {
      tags: ['Classrooms - Lessons'],
      summary: 'Lấy danh sách lessons (Member)',
      security: auth,
      parameters: [idParam],
      responses: {
        '200': { description: 'Danh sách lessons' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/lessons/{lessonId}': {
    get: {
      tags: ['Classrooms - Lessons'],
      summary: 'Lấy chi tiết lesson (Member)',
      security: auth,
      parameters: [
        idParam,
        { name: 'lessonId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Chi tiết lesson kèm flashcards' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    patch: {
      tags: ['Classrooms - Lessons'],
      summary: 'Cập nhật lesson (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'lessonId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateLessonBody' } },
        },
      },
      responses: {
        '200': { description: 'Cập nhật thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    delete: {
      tags: ['Classrooms - Lessons'],
      summary: 'Xoá lesson (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'lessonId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/lessons/{lessonId}/import-studyset': {
    post: {
      tags: ['Classrooms - Lessons'],
      summary: 'Import flashcards từ study set vào lesson (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'lessonId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['studySetId'],
              properties: { studySetId: { type: 'integer', example: 1 } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Import flashcards thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/classrooms/{id}/lessons/{lessonId}/flashcards': {
    post: {
      tags: ['Classrooms - Lessons'],
      summary: 'Thêm flashcard vào lesson (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'lessonId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateLessonFlashcardBody' } },
        },
      },
      responses: {
        '201': { description: 'Flashcard được thêm' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/lessons/{lessonId}/flashcards/{flashcardId}': {
    patch: {
      tags: ['Classrooms - Lessons'],
      summary: 'Cập nhật flashcard trong lesson (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'lessonId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'flashcardId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateLessonFlashcardBody' } },
        },
      },
      responses: {
        '200': { description: 'Cập nhật thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    delete: {
      tags: ['Classrooms - Lessons'],
      summary: 'Xoá flashcard khỏi lesson (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'lessonId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'flashcardId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // ══════════════════ CLASSROOM QUIZZES ══════════════════
  '/classrooms/{id}/quizzes': {
    post: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Tạo quiz mới trong classroom (Teacher)',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateClassroomQuizBody' } },
        },
      },
      responses: {
        '201': { description: 'Quiz được tạo thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    get: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Lấy danh sách quizzes trong classroom (Member)',
      security: auth,
      parameters: [idParam],
      responses: {
        '200': { description: 'Danh sách quizzes' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/quizzes/{quizId}': {
    get: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Lấy chi tiết quiz kèm câu hỏi (Member)',
      security: auth,
      parameters: [
        idParam,
        { name: 'quizId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Chi tiết quiz' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    patch: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Cập nhật quiz (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'quizId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateClassroomQuizBody' } },
        },
      },
      responses: {
        '200': { description: 'Cập nhật thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    delete: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Xoá quiz (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'quizId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/quizzes/{quizId}/attempt': {
    post: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Nộp bài quiz (Member)',
      security: auth,
      parameters: [
        idParam,
        { name: 'quizId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/SubmitQuizAttemptBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Kết quả quiz',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      score: { type: 'number' },
                      correctCount: { type: 'integer' },
                      totalQuestions: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/quizzes/{quizId}/import-studyset': {
    post: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Import câu hỏi từ study set vào quiz (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'quizId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['studySetId'],
              properties: { studySetId: { type: 'integer', example: 1 } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Import thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/quizzes/{quizId}/questions': {
    post: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Thêm câu hỏi vào quiz (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'quizId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateClassroomQuizQuestionBody' } },
        },
      },
      responses: {
        '201': { description: 'Câu hỏi được thêm' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/classrooms/{id}/quizzes/{quizId}/questions/{questionId}': {
    patch: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Cập nhật câu hỏi trong quiz (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'quizId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'questionId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateClassroomQuizQuestionBody' } },
        },
      },
      responses: {
        '200': { description: 'Cập nhật thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    delete: {
      tags: ['Classrooms - Quizzes'],
      summary: 'Xoá câu hỏi khỏi quiz (Teacher)',
      security: auth,
      parameters: [
        idParam,
        { name: 'quizId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'questionId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // ══════════════════ CHAT HISTORY ══════════════════
  '/classrooms/{id}/messages': {
    get: {
      tags: ['Classrooms'],
      summary: 'Lấy lịch sử chat trong classroom (Member)',
      description: 'Cursor-based pagination. Dùng `beforeId` để load thêm tin nhắn cũ hơn.',
      security: auth,
      parameters: [
        idParam,
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        {
          name: 'beforeId',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Load messages older than this message ID',
        },
      ],
      responses: {
        '200': {
          description: 'Lịch sử chat',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        content: { type: 'string' },
                        type: { type: 'string', enum: ['TEXT', 'FILE', 'IMAGE', 'SYSTEM'] },
                        sender: { $ref: '#/components/schemas/UserProfile' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
}
