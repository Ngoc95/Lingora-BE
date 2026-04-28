import type { OpenAPIV3 } from 'openapi-types'

const pagParams: OpenAPIV3.ParameterObject[] = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'e.g. +id | -name' },
]

const idParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer' },
}

export const learningPaths: OpenAPIV3.PathsObject = {
  // ══════════════════ CATEGORIES ══════════════════
  '/categories': {
    post: {
      tags: ['Categories'],
      summary: 'Tạo category mới (Admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CategoryBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Category được tạo thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Category' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    get: {
      tags: ['Categories'],
      summary: 'Lấy danh sách tất cả categories (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: pagParams,
      responses: {
        '200': {
          description: 'Danh sách categories',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
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

  '/categories/{id}/topics': {
    get: {
      tags: ['Categories'],
      summary: 'Lấy category theo ID kèm danh sách topics',
      security: [{ bearerAuth: [] }],
      parameters: [idParam, ...pagParams],
      responses: {
        '200': {
          description: 'Category với topics',
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
                            items: { $ref: '#/components/schemas/Topic' },
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

  '/categories/{id}': {
    patch: {
      tags: ['Categories'],
      summary: 'Cập nhật category theo ID (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CategoryBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Cập nhật thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Category' } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Categories'],
      summary: 'Xoá category theo ID (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ TOPICS ══════════════════
  '/topics': {
    post: {
      tags: ['Topics'],
      summary: 'Tạo topic mới (Admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/TopicBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Topic được tạo thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Topic' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    get: {
      tags: ['Topics'],
      summary: 'Lấy danh sách topics (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...pagParams,
        {
          name: 'hasCategory',
          in: 'query',
          schema: { type: 'boolean' },
          description: 'true: chỉ topics có category; false: chỉ topics chưa gắn category',
        },
      ],
      responses: {
        '200': {
          description: 'Danh sách topics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Topic' } },
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

  '/topics/{id}/words': {
    get: {
      tags: ['Topics'],
      summary: 'Lấy topic kèm danh sách words (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        idParam,
        ...pagParams,
        { name: 'cefrLevel', in: 'query', schema: { type: 'string', enum: ['A1','A2','B1','B2','C1','C2'] } },
        { name: 'type', in: 'query', schema: { type: 'string' }, description: 'WordType enum' },
      ],
      responses: {
        '200': {
          description: 'Topic với words',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    allOf: [
                      { $ref: '#/components/schemas/Topic' },
                      {
                        type: 'object',
                        properties: {
                          words: { type: 'array', items: { $ref: '#/components/schemas/Word' } },
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

  '/topics/{id}': {
    patch: {
      tags: ['Topics'],
      summary: 'Cập nhật topic (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/TopicBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Cập nhật thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Topic' } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Topics'],
      summary: 'Xoá topic (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ WORDS ══════════════════
  '/words/dictionary': {
    get: {
      tags: ['Words'],
      summary: 'Tra cứu từ điển (Public)',
      description: 'Endpoint công khai — không cần đăng nhập. Tra cứu nghĩa, ví dụ, phát âm của một từ.',
      parameters: [
        { name: 'term', in: 'query', required: true, schema: { type: 'string' }, description: 'Từ cần tra cứu' },
      ],
      responses: {
        '200': {
          description: 'Thông tin từ điển',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Word' },
                },
              },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/words/suggest': {
    get: {
      tags: ['Words'],
      summary: 'Gợi ý từ cho autocomplete (Public)',
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Từ khóa tìm kiếm' },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        '200': {
          description: 'Danh sách gợi ý',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  },

  '/words': {
    post: {
      tags: ['Words'],
      summary: 'Tạo từ mới (Admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/WordBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Từ được tạo thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Word' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },

    get: {
      tags: ['Words'],
      summary: 'Lấy danh sách từ (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...pagParams,
        { name: 'cefrLevel', in: 'query', schema: { type: 'string', enum: ['A1','A2','B1','B2','C1','C2'] } },
        { name: 'type', in: 'query', schema: { type: 'string' }, description: 'WordType enum' },
        { name: 'topicId', in: 'query', schema: { type: 'integer' } },
        {
          name: 'hasTopic',
          in: 'query',
          schema: { type: 'boolean' },
          description: 'true: từ đã gắn topic; false: từ chưa gắn topic',
        },
      ],
      responses: {
        '200': {
          description: 'Danh sách từ',
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

  '/words/{id}': {
    get: {
      tags: ['Words'],
      summary: 'Lấy từ theo ID',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        '200': {
          description: 'Chi tiết từ',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Word' } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    patch: {
      tags: ['Words'],
      summary: 'Cập nhật từ theo ID (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/WordBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Cập nhật thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Word' } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Words'],
      summary: 'Xoá từ theo ID (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}
