import type { OpenAPIV3 } from 'openapi-types'

const paginationParams: OpenAPIV3.ParameterObject[] = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
  { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by username or email' },
  { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'e.g. +id | -createdAt' },
]

export const usersPaths: OpenAPIV3.PathsObject = {
  '/users': {
    post: {
      tags: ['Users'],
      summary: 'Tạo người dùng mới (Admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateUserBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Người dùng được tạo thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/UserProfile' } },
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
      tags: ['Users'],
      summary: 'Lấy danh sách người dùng (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        ...paginationParams,
        {
          name: 'proficiency',
          in: 'query',
          schema: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'BANNED', 'DELETED'] },
        },
      ],
      responses: {
        '200': {
          description: 'Danh sách người dùng có phân trang',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/UserProfile' } },
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

  '/users/{id}': {
    get: {
      tags: ['Users'],
      summary: 'Lấy thông tin người dùng theo ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': {
          description: 'Thông tin người dùng',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/UserProfile' } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    patch: {
      tags: ['Users'],
      summary: 'Cập nhật thông tin người dùng',
      description: 'Admin có thể cập nhật bất kỳ trường nào kể cả roleIds và status. User thường chỉ cập nhật thông tin của chính mình.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateUserBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Cập nhật thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/UserProfile' } },
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

    delete: {
      tags: ['Users'],
      summary: 'Xoá mềm người dùng theo ID (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Người dùng đã bị xoá' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/users/restore/{id}': {
    patch: {
      tags: ['Users'],
      summary: 'Khôi phục người dùng đã bị xoá mềm (Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Khôi phục thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}
