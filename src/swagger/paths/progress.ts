import type { OpenAPIV3 } from 'openapi-types'

const auth = [{ bearerAuth: [] }]

export const progressPaths: OpenAPIV3.PathsObject = {
  // ══════════════════ WORD PROGRESS ══════════════════
  '/progress': {
    post: {
      tags: ['Progress'],
      summary: 'Tạo word progress cho nhiều từ (bắt đầu học)',
      description: 'Khởi tạo bản ghi học cho danh sách từ đã chọn.',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['wordIds'],
              properties: {
                wordIds: {
                  type: 'array',
                  items: { type: 'integer' },
                  example: [1, 2, 3],
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Word progress đã được khởi tạo' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },

    patch: {
      tags: ['Progress'],
      summary: 'Cập nhật tiến độ học nhiều từ (sau mỗi phiên ôn tập)',
      description: 'Cập nhật số lần sai và ngày ôn tập để tính SRS (Spaced Repetition).',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['wordProgress'],
              properties: {
                wordProgress: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['wordId', 'wrongCount', 'reviewedDate'],
                    properties: {
                      wordId: { type: 'integer', example: 1 },
                      wrongCount: { type: 'integer', example: 0 },
                      reviewedDate: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Cập nhật tiến độ thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  // ══════════════════ CATEGORIES / TOPICS FOR USER ══════════════════
  '/progress/categories': {
    get: {
      tags: ['Progress'],
      summary: 'Lấy danh sách categories kèm tiến độ học (User)',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Danh sách categories với tiến độ',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      allOf: [
                        { $ref: '#/components/schemas/Category' },
                        {
                          type: 'object',
                          properties: {
                            progress: {
                              type: 'object',
                              properties: {
                                totalTopics: { type: 'integer' },
                                learnedTopics: { type: 'integer' },
                                percentComplete: { type: 'number' },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
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

  '/progress/categories/{id}/topics': {
    get: {
      tags: ['Progress'],
      summary: 'Lấy tiến độ category kèm topics (User)',
      security: auth,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'sort', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Category với danh sách topics và tiến độ',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    allOf: [
                      { $ref: '#/components/schemas/Category' },
                      {
                        type: 'object',
                        properties: {
                          topics: {
                            type: 'array',
                            items: {
                              allOf: [
                                { $ref: '#/components/schemas/Topic' },
                                {
                                  type: 'object',
                                  properties: {
                                    progress: {
                                      type: 'object',
                                      properties: {
                                        totalWords: { type: 'integer' },
                                        learnedWords: { type: 'integer' },
                                        percentComplete: { type: 'number' },
                                      },
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
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

  '/progress/topics/{id}/words': {
    get: {
      tags: ['Progress'],
      summary: 'Lấy tiến độ từ trong topic (User)',
      security: auth,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        {
          name: 'hasLearned',
          in: 'query',
          schema: { type: 'boolean' },
          description: 'true: chỉ từ đã học; false: chỉ từ chưa học',
        },
      ],
      responses: {
        '200': {
          description: 'Danh sách từ với tiến độ SRS',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      allOf: [
                        { $ref: '#/components/schemas/Word' },
                        {
                          type: 'object',
                          properties: {
                            progress: {
                              type: 'object',
                              properties: {
                                isLearned: { type: 'boolean' },
                                wrongCount: { type: 'integer' },
                                nextReviewDate: { type: 'string', format: 'date-time', nullable: true },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
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

  '/progress/topics/{id}/study': {
    get: {
      tags: ['Progress'],
      summary: 'Lấy danh sách từ để học trong topic (User)',
      description: 'Trả về `count` từ chưa học hoặc đến hạn ôn tập để bắt đầu phiên học.',
      security: auth,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'count', in: 'query', required: true, schema: { type: 'integer', example: 10 } },
      ],
      responses: {
        '200': {
          description: 'Danh sách từ cần học',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Word' } },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/progress/review': {
    get: {
      tags: ['Progress'],
      summary: 'Lấy danh sách từ cần ôn tập hôm nay (SRS)',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        '200': {
          description: 'Từ đến hạn ôn tập',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Word' } },
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

  '/progress/word-statistics': {
    get: {
      tags: ['Progress'],
      summary: 'Thống kê từ vựng của người dùng',
      security: auth,
      responses: {
        '200': {
          description: 'Thống kê từ vựng',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      totalWords: { type: 'integer' },
                      learnedWords: { type: 'integer' },
                      masteredWords: { type: 'integer' },
                      reviewDueWords: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/progress/streak': {
    get: {
      tags: ['Progress'],
      summary: 'Lấy thông tin streak học tập của người dùng',
      security: auth,
      responses: {
        '200': {
          description: 'Thông tin streak',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      currentStreak: { type: 'integer', example: 7 },
                      longestStreak: { type: 'integer', example: 30 },
                      lastStudyDate: { type: 'string', format: 'date', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
}
