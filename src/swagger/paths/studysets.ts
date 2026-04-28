import type { OpenAPIV3 } from 'openapi-types'

const auth = [{ bearerAuth: [] }]
const idParam: OpenAPIV3.ParameterObject = {
  name: 'id', in: 'path', required: true, schema: { type: 'integer' },
}
const pagParams: OpenAPIV3.ParameterObject[] = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'e.g. -createdAt,+title' },
  { name: 'visibility', in: 'query', schema: { type: 'string', enum: ['PRIVATE', 'PUBLIC'] } },
  { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] } },
  { name: 'minPrice', in: 'query', schema: { type: 'number' } },
  { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
]

export const studySetsPaths: OpenAPIV3.PathsObject = {
  '/studysets': {
    post: {
      tags: ['Study Sets'],
      summary: 'Tạo study set mới',
      description: 'PRIVATE → status DRAFT; PUBLIC → status PUBLISHED.',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateStudySetBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Study set được tạo thành công',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { data: { type: 'object' } } },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },

    get: {
      tags: ['Study Sets'],
      summary: 'Lấy danh sách study sets công khai (published)',
      security: auth,
      parameters: pagParams,
      responses: {
        '200': {
          description: 'Danh sách study sets',
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

  '/studysets/own': {
    get: {
      tags: ['Study Sets'],
      summary: 'Lấy study sets của người dùng hiện tại',
      security: auth,
      parameters: pagParams,
      responses: {
        '200': {
          description: 'Study sets của mình',
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

  '/studysets/{id}': {
    get: {
      tags: ['Study Sets'],
      summary: 'Lấy chi tiết study set theo ID',
      security: auth,
      parameters: [idParam],
      responses: {
        '200': {
          description: 'Chi tiết study set kèm flashcards và quizzes',
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

    patch: {
      tags: ['Study Sets'],
      summary: 'Cập nhật study set',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateStudySetBody' } },
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
      tags: ['Study Sets'],
      summary: 'Xoá study set',
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

  '/studysets/{id}/flashcards': {
    post: {
      tags: ['Study Sets'],
      summary: 'Thêm flashcard vào study set',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/FlashcardInput' } },
        },
      },
      responses: {
        '201': { description: 'Flashcard được thêm thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/studysets/{id}/buy': {
    post: {
      tags: ['Study Sets'],
      summary: 'Mua study set qua VNPay',
      description: 'Trả về payment URL để chuyển hướng người dùng đến cổng thanh toán VNPay.',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: false,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/BuyStudySetBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Payment URL',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: { paymentUrl: { type: 'string', format: 'uri' } },
                  },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}
