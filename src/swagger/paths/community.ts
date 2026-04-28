import type { OpenAPIV3 } from 'openapi-types'

const auth = [{ bearerAuth: [] }]
const idParam: OpenAPIV3.ParameterObject = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }

export const communityPaths: OpenAPIV3.PathsObject = {
  // ══════════════════ POSTS ══════════════════
  '/posts': {
    post: {
      tags: ['Community - Posts'],
      summary: 'Tạo bài viết mới',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreatePostBody' } },
        },
      },
      responses: {
        '201': { description: 'Bài viết được tạo thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },

    get: {
      tags: ['Community - Posts'],
      summary: 'Lấy danh sách bài viết',
      description: 'Mặc định chỉ trả về bài PUBLISHED. Admin/Owner có thể filter theo status.',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Tìm trong title và content' },
        { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'e.g. -createdAt' },
        { name: 'ownerId', in: 'query', schema: { type: 'integer' } },
        { name: 'topic', in: 'query', schema: { type: 'string', enum: ['general','vocabulary','grammar','listening','speaking','reading','writing'] } },
        { name: 'tags', in: 'query', schema: { type: 'string' }, description: 'Comma-separated tags' },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PUBLISHED','ARCHIVED','DELETED'] } },
      ],
      responses: {
        '200': {
          description: 'Danh sách bài viết',
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

  '/posts/{id}': {
    get: {
      tags: ['Community - Posts'],
      summary: 'Lấy chi tiết bài viết theo ID',
      security: auth,
      parameters: [idParam],
      responses: {
        '200': { description: 'Chi tiết bài viết' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    patch: {
      tags: ['Community - Posts'],
      summary: 'Cập nhật bài viết (Owner)',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdatePostBody' } },
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
      tags: ['Community - Posts'],
      summary: 'Xoá bài viết (Admin hoặc Owner)',
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

  // ══════════════════ COMMENTS ══════════════════
  '/comments/target/{targetId}/parent/{parentId}': {
    get: {
      tags: ['Community - Comments'],
      summary: 'Lấy danh sách comment con của một target',
      description: 'Dùng `parentId = null` để lấy top-level comments.',
      security: auth,
      parameters: [
        { name: 'targetId', in: 'path', required: true, schema: { type: 'integer' } },
        {
          name: 'parentId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của comment cha, hoặc chuỗi "null" cho top-level comments',
        },
        {
          name: 'targetType',
          in: 'query',
          schema: { type: 'string', enum: ['POST', 'COMMENT', 'STUDY_SET'], default: 'POST' },
        },
      ],
      responses: {
        '200': {
          description: 'Danh sách comments',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { type: 'array', items: { type: 'object' } } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/comments/{commentId}': {
    get: {
      tags: ['Community - Comments'],
      summary: 'Lấy comment theo ID',
      security: auth,
      parameters: [
        { name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Chi tiết comment' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Community - Comments'],
      summary: 'Xoá comment (Owner)',
      security: auth,
      parameters: [
        { name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/comments/target/{targetId}': {
    post: {
      tags: ['Community - Comments'],
      summary: 'Tạo comment mới cho một target',
      security: auth,
      parameters: [
        { name: 'targetId', in: 'path', required: true, schema: { type: 'integer' } },
        {
          name: 'targetType',
          in: 'query',
          schema: { type: 'string', enum: ['POST', 'COMMENT', 'STUDY_SET'], default: 'POST' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateCommentBody' } },
        },
      },
      responses: {
        '201': { description: 'Comment được tạo thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/comments/{commentId}/target/{targetId}': {
    patch: {
      tags: ['Community - Comments'],
      summary: 'Cập nhật comment (Owner)',
      security: auth,
      parameters: [
        { name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'targetId', in: 'path', required: true, schema: { type: 'integer' } },
        {
          name: 'targetType',
          in: 'query',
          schema: { type: 'string', enum: ['POST', 'COMMENT', 'STUDY_SET'], default: 'POST' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['content'],
              properties: { content: { type: 'string', maxLength: 256 } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Cập nhật thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ LIKES ══════════════════
  '/likes/{targetId}': {
    post: {
      tags: ['Community - Likes'],
      summary: 'Like một target (post, comment, study set)',
      security: auth,
      parameters: [
        { name: 'targetId', in: 'path', required: true, schema: { type: 'integer' } },
        {
          name: 'targetType',
          in: 'query',
          required: true,
          schema: { type: 'string', enum: ['POST', 'COMMENT', 'STUDY_SET'] },
        },
      ],
      responses: {
        '200': { description: 'Like thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '409': { description: 'Đã like rồi' },
      },
    },

    delete: {
      tags: ['Community - Likes'],
      summary: 'Unlike một target',
      security: auth,
      parameters: [
        { name: 'targetId', in: 'path', required: true, schema: { type: 'integer' } },
        {
          name: 'targetType',
          in: 'query',
          required: true,
          schema: { type: 'string', enum: ['POST', 'COMMENT', 'STUDY_SET'] },
        },
      ],
      responses: {
        '200': { description: 'Unlike thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ REPORTS ══════════════════
  '/reports': {
    post: {
      tags: ['Community - Reports'],
      summary: 'Báo cáo nội dung vi phạm',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateReportBody' } },
        },
      },
      responses: {
        '201': { description: 'Báo cáo được gửi thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },

    get: {
      tags: ['Community - Reports'],
      summary: 'Lấy danh sách báo cáo (Admin)',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'sort', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING','ACCEPTED','REJECTED'] } },
        { name: 'targetType', in: 'query', schema: { type: 'string', enum: ['POST','STUDY_SET','COMMENT'] } },
        { name: 'createdBy', in: 'query', schema: { type: 'integer' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Danh sách báo cáo',
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

  '/reports/{id}': {
    get: {
      tags: ['Community - Reports'],
      summary: 'Lấy chi tiết báo cáo (Admin)',
      security: auth,
      parameters: [idParam],
      responses: {
        '200': { description: 'Chi tiết báo cáo' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },

    delete: {
      tags: ['Community - Reports'],
      summary: 'Xoá báo cáo (Admin)',
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

  '/reports/{id}/status': {
    patch: {
      tags: ['Community - Reports'],
      summary: 'Cập nhật trạng thái báo cáo (Admin)',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateReportStatusBody' } },
        },
      },
      responses: {
        '200': { description: 'Cập nhật thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/reports/{id}/handle': {
    patch: {
      tags: ['Community - Reports'],
      summary: 'Xử lý báo cáo kèm hành động (Admin)',
      description: 'Duyệt/từ chối báo cáo và thực hiện hành động như xoá nội dung, cảnh cáo, tạm khóa hoặc ban tài khoản.',
      security: auth,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/HandleReportBody' } },
        },
      },
      responses: {
        '200': { description: 'Xử lý thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}
