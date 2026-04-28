import type { OpenAPIV3 } from 'openapi-types'

const auth = [{ bearerAuth: [] }]

export const examsPaths: OpenAPIV3.PathsObject = {
  // ══════════════════ PUBLIC / USER EXAM ══════════════════
  '/exams': {
    get: {
      tags: ['Exams'],
      summary: 'Lấy danh sách đề thi (Public)',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Danh sách đề thi',
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
      },
    },
  },

  '/exams/{examId}': {
    get: {
      tags: ['Exams'],
      summary: 'Lấy chi tiết đề thi',
      description: 'Đăng nhập không bắt buộc. Khi đăng nhập, trả về thêm lịch sử làm bài.',
      parameters: [{ name: 'examId', in: 'path', required: true, schema: { type: 'integer' } }],
      security: [],
      responses: {
        '200': {
          description: 'Chi tiết đề thi',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { data: { type: 'object' } } },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/exams/{examId}/sections/{sectionId}': {
    get: {
      tags: ['Exams'],
      summary: 'Lấy chi tiết section của đề thi',
      parameters: [
        { name: 'examId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'sectionId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': {
          description: 'Chi tiết section',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { data: { type: 'object' } } },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/exams/{examId}/start': {
    post: {
      tags: ['Exams'],
      summary: 'Bắt đầu làm bài thi',
      security: auth,
      parameters: [{ name: 'examId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/StartExamAttemptBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Attempt được tạo — trả về attemptId',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      attemptId: { type: 'integer' },
                      startedAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/exam-attempts/{attemptId}/sections/{sectionId}/submit': {
    post: {
      tags: ['Exams'],
      summary: 'Nộp section của bài thi',
      security: auth,
      parameters: [
        { name: 'attemptId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'sectionId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/SubmitExamSectionBody' } },
        },
      },
      responses: {
        '200': { description: 'Section đã được nộp' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/exam-attempts/{attemptId}/submit': {
    post: {
      tags: ['Exams'],
      summary: 'Nộp toàn bộ bài thi',
      security: auth,
      parameters: [{ name: 'attemptId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': {
          description: 'Bài thi đã được nộp — trả về kết quả',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      score: { type: 'number', example: 7.5 },
                      band: { type: 'string', example: 'B2' },
                      sections: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/exam-attempts': {
    get: {
      tags: ['Exams'],
      summary: 'Lấy lịch sử làm bài thi của người dùng',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        '200': {
          description: 'Lịch sử làm bài',
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

  '/exam-attempts/{attemptId}': {
    get: {
      tags: ['Exams'],
      summary: 'Lấy chi tiết kết quả một lần làm bài',
      security: auth,
      parameters: [{ name: 'attemptId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': {
          description: 'Chi tiết kết quả',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { data: { type: 'object' } } },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ ADMIN EXAM ══════════════════
  '/admin/exams/import': {
    post: {
      tags: ['Exams (Admin)'],
      summary: 'Import đề thi mới (Admin)',
      description: 'Tạo đề thi với đầy đủ sections và câu hỏi từ JSON.',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ImportExamBody' } },
        },
      },
      responses: {
        '201': { description: 'Đề thi được import thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/exams/{examId}': {
    patch: {
      tags: ['Exams (Admin)'],
      summary: 'Cập nhật đề thi (Admin)',
      security: auth,
      parameters: [{ name: 'examId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateExamBody' } },
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
      tags: ['Exams (Admin)'],
      summary: 'Xoá đề thi (Admin)',
      security: auth,
      parameters: [{ name: 'examId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/admin/exam-attempts': {
    get: {
      tags: ['Exams (Admin)'],
      summary: 'Lấy tất cả lịch sử làm bài (Admin)',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'userId', in: 'query', schema: { type: 'integer' } },
        { name: 'examId', in: 'query', schema: { type: 'integer' } },
      ],
      responses: {
        '200': {
          description: 'Danh sách attempts',
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
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/exam-attempts/{attemptId}': {
    get: {
      tags: ['Exams (Admin)'],
      summary: 'Lấy chi tiết attempt (Admin)',
      security: auth,
      parameters: [{ name: 'attemptId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': {
          description: 'Chi tiết attempt',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { data: { type: 'object' } } },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}
