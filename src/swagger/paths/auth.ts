import type { OpenAPIV3 } from 'openapi-types'

export const authPaths: OpenAPIV3.PathsObject = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Đăng ký tài khoản mới',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RegisterBody' } },
        },
      },
      responses: {
        '201': {
          description: 'Đăng ký thành công',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '409': {
          description: 'Email đã được sử dụng',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
          },
        },
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Đăng nhập bằng email hoặc username và mật khẩu',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/LoginBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Đăng nhập thành công — refreshToken được set vào cookie',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/auth/google': {
    post: {
      tags: ['Auth'],
      summary: 'Đăng nhập / đăng ký bằng Google OAuth',
      description: 'Xác thực với Google ID token (lấy từ Firebase / Google Sign-In SDK trên mobile).',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/GoogleAuthBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Thành công — trả về accessToken, user; refreshToken set vào cookie',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/auth/refresh-token': {
    post: {
      tags: ['Auth'],
      summary: 'Làm mới access token',
      description: 'refreshToken có thể được truyền qua cookie (HTTP-only) hoặc body.',
      requestBody: {
        required: false,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Access token mới',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: { accessToken: { type: 'string' } },
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

  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Đăng xuất',
      description: 'Xoá refresh token và clear cookie.',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': { description: 'Đăng xuất thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/auth/password-reset/request': {
    post: {
      tags: ['Auth'],
      summary: 'Yêu cầu đặt lại mật khẩu (gửi OTP qua email)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', format: 'email', example: 'john@example.com' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'OTP đã được gửi đến email' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/auth/password-reset/verify': {
    post: {
      tags: ['Auth'],
      summary: 'Xác minh OTP đặt lại mật khẩu',
      description: 'Trả về `resetToken` để dùng ở bước confirm.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'code'],
              properties: {
                email: { type: 'string', format: 'email', example: 'john@example.com' },
                code: { type: 'string', example: '123456' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'OTP hợp lệ — trả về resetToken',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: { resetToken: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
      },
    },
  },

  '/auth/password-reset/confirm': {
    post: {
      tags: ['Auth'],
      summary: 'Xác nhận đặt lại mật khẩu mới',
      description: 'Đặt mật khẩu mới bằng resetToken (Bearer header).',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['newPassword'],
              properties: {
                newPassword: { type: 'string', format: 'password', minLength: 6, example: 'newpass123' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Đặt lại mật khẩu thành công' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Lấy thông tin người dùng hiện tại',
      security: [{ bearerAuth: [] }],
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
      },
    },
  },

  '/auth/email-verification/request': {
    post: {
      tags: ['Auth'],
      summary: 'Yêu cầu gửi OTP xác minh email',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': { description: 'Email xác minh đã được gửi' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/auth/email-verification/verify': {
    post: {
      tags: ['Auth'],
      summary: 'Xác minh tài khoản bằng OTP',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code'],
              properties: { code: { type: 'string', example: '654321' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Tài khoản đã được xác minh' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
}
