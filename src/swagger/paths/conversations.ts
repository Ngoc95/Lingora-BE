import type { OpenAPIV3 } from 'openapi-types'

const auth = [{ bearerAuth: [] }]

export const conversationsPaths: OpenAPIV3.PathsObject = {
  '/conversation/contexts': {
    get: {
      tags: ['Conversations'],
      summary: 'Lấy danh sách ngữ cảnh hội thoại (scenario)',
      description: 'Mỗi context là một chủ đề như "Ordering food", "Job interview", ... Dùng để tạo phiên hội thoại.',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'sort', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Danh sách contexts',
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
                        name: { type: 'string', example: 'Ordering Food' },
                        description: { type: 'string' },
                        difficulty: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
                        systemPrompt: { type: 'string' },
                      },
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

  '/conversation/contexts/{id}/templates': {
    get: {
      tags: ['Conversations'],
      summary: 'Lấy suggestion templates của một context',
      description: 'Các gợi ý câu mở đầu để người dùng bắt đầu hội thoại dễ hơn.',
      security: auth,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': {
          description: 'Danh sách suggestion templates',
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
                        text: { type: 'string', example: "Hi! I'd like to order a coffee, please." },
                        category: { type: 'string' },
                      },
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

  '/conversation/sessions': {
    post: {
      tags: ['Conversations'],
      summary: 'Tạo phiên hội thoại mới',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateSessionBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Phiên hội thoại được tạo',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      contextId: { type: 'integer' },
                      status: { type: 'string', enum: ['ACTIVE', 'ENDED'] },
                      createdAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },

    get: {
      tags: ['Conversations'],
      summary: 'Lấy lịch sử phiên hội thoại của người dùng',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'sort', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Danh sách phiên hội thoại',
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

  '/conversation/sessions/{id}': {
    get: {
      tags: ['Conversations'],
      summary: 'Lấy chi tiết phiên hội thoại kèm toàn bộ tin nhắn',
      security: auth,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': {
          description: 'Chi tiết phiên hội thoại',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      status: { type: 'string', enum: ['ACTIVE', 'ENDED'] },
                      context: { type: 'object' },
                      messages: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ConversationMessage' },
                      },
                      score: { type: 'object', nullable: true },
                    },
                  },
                },
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
      tags: ['Conversations'],
      summary: 'Xoá phiên hội thoại',
      security: auth,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/conversation/sessions/{id}/messages': {
    post: {
      tags: ['Conversations'],
      summary: 'Gửi tin nhắn trong phiên hội thoại (AI sẽ phản hồi)',
      description: 'AI phát hiện lỗi ngữ pháp, đưa ra phản hồi và gợi ý câu tiếp theo. Kết quả bao gồm: phản hồi của AI, danh sách lỗi và suggestions.',
      security: auth,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/SendMessageBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Phản hồi từ AI',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      userMessage: { $ref: '#/components/schemas/ConversationMessage' },
                      aiMessage: { $ref: '#/components/schemas/ConversationMessage' },
                    },
                  },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/conversation/sessions/{id}/end': {
    patch: {
      tags: ['Conversations'],
      summary: 'Kết thúc phiên hội thoại và nhận điểm đánh giá',
      description: 'Tính điểm toàn phiên dựa trên độ chính xác ngữ pháp, từ vựng, và sự lưu loát. Kết quả được lưu vào DB.',
      security: auth,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': {
          description: 'Phiên hội thoại kết thúc — kèm điểm đánh giá',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      score: {
                        type: 'object',
                        properties: {
                          overall: { type: 'number', example: 7.5 },
                          grammar: { type: 'number', example: 8.0 },
                          vocabulary: { type: 'number', example: 7.0 },
                          fluency: { type: 'number', example: 7.5 },
                          feedback: { type: 'string' },
                        },
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
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}
