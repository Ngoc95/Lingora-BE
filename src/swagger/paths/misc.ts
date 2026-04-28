import type { OpenAPIV3 } from 'openapi-types'

const auth = [{ bearerAuth: [] }]

export const miscPaths: OpenAPIV3.PathsObject = {
  // ══════════════════ RANKINGS ══════════════════
  '/rankings/me': {
    get: {
      tags: ['Rankings'],
      summary: 'Lấy thống kê xếp hạng của bản thân (XP, level, streak)',
      security: auth,
      responses: {
        '200': {
          description: 'Thống kê cá nhân',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      totalXp: { type: 'integer', example: 4200 },
                      level: { type: 'integer', example: 5 },
                      currentStreak: { type: 'integer', example: 7 },
                      globalRank: { type: 'integer', nullable: true },
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

  '/rankings/me/rank': {
    get: {
      tags: ['Rankings'],
      summary: 'Lấy thứ hạng của bản thân trên bảng xếp hạng',
      security: auth,
      parameters: [
        { name: 'period', in: 'query', schema: { type: 'string', enum: ['weekly','monthly','alltime'], default: 'weekly' } },
        { name: 'scope', in: 'query', schema: { type: 'string', enum: ['global','classroom'], default: 'global' } },
        { name: 'classroomId', in: 'query', schema: { type: 'integer' }, description: 'Bắt buộc khi scope=classroom' },
      ],
      responses: {
        '200': { description: 'Thứ hạng và người xung quanh' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/rankings/me/history': {
    get: {
      tags: ['Rankings'],
      summary: 'Lịch sử nhận XP của bản thân',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'actionType', in: 'query', schema: { type: 'string' }, description: 'Lọc theo loại hành động XP' },
        { name: 'classroomId', in: 'query', schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Lịch sử XP' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/rankings/global': {
    get: {
      tags: ['Rankings'],
      summary: 'Bảng xếp hạng toàn cầu',
      security: auth,
      parameters: [
        { name: 'period', in: 'query', schema: { type: 'string', enum: ['weekly','monthly','alltime'], default: 'weekly' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Bảng xếp hạng' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/rankings/classrooms/{classroomId}': {
    get: {
      tags: ['Rankings'],
      summary: 'Bảng xếp hạng trong một classroom',
      security: auth,
      parameters: [
        { name: 'classroomId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'period', in: 'query', schema: { type: 'string', enum: ['weekly','monthly','alltime'], default: 'weekly' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Bảng xếp hạng classroom' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/rankings/classrooms/{classroomId}/me': {
    get: {
      tags: ['Rankings'],
      summary: 'Thứ hạng của bản thân trong classroom',
      security: auth,
      parameters: [
        { name: 'classroomId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Thứ hạng trong classroom' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/rankings/admin/adjust': {
    post: {
      tags: ['Rankings'],
      summary: 'Điều chỉnh XP thủ công cho người dùng (Admin)',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AdjustXpBody' } },
        },
      },
      responses: {
        '200': { description: 'XP đã được điều chỉnh' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/rankings/admin/recompute': {
    post: {
      tags: ['Rankings'],
      summary: 'Tính lại bảng xếp hạng (Admin)',
      security: auth,
      parameters: [
        { name: 'scope', in: 'query', schema: { type: 'string', enum: ['global','classroom'], default: 'global' } },
        { name: 'period', in: 'query', schema: { type: 'string', enum: ['weekly','monthly','alltime'] } },
        { name: 'classroomId', in: 'query', schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Tính toán lại thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // ══════════════════ WITHDRAWALS ══════════════════
  '/withdrawals': {
    post: {
      tags: ['Withdrawals'],
      summary: 'Tạo yêu cầu rút tiền',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateWithdrawalBody' } },
        },
      },
      responses: {
        '201': { description: 'Yêu cầu rút tiền được tạo' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/withdrawals/me': {
    get: {
      tags: ['Withdrawals'],
      summary: 'Lấy lịch sử yêu cầu rút tiền của bản thân',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING','APPROVED','REJECTED','COMPLETED','FAILED'] } },
        { name: 'sort', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Danh sách yêu cầu rút tiền' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/withdrawals/balance': {
    get: {
      tags: ['Withdrawals'],
      summary: 'Lấy số dư tài khoản hiện tại',
      security: auth,
      responses: {
        '200': {
          description: 'Số dư tài khoản',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: { balance: { type: 'number', example: 500000, description: 'Số dư tính bằng VND' } },
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

  '/withdrawals/{id}': {
    get: {
      tags: ['Withdrawals'],
      summary: 'Lấy chi tiết yêu cầu rút tiền của mình',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': { description: 'Chi tiết yêu cầu' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/withdrawals/admin/all': {
    get: {
      tags: ['Withdrawals'],
      summary: 'Lấy tất cả yêu cầu rút tiền (Admin)',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'userId', in: 'query', schema: { type: 'integer' } },
      ],
      responses: {
        '200': { description: 'Danh sách tất cả yêu cầu rút tiền' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/withdrawals/admin/{id}': {
    get: {
      tags: ['Withdrawals'],
      summary: 'Lấy chi tiết yêu cầu rút tiền bất kỳ (Admin)',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': { description: 'Chi tiết yêu cầu' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/withdrawals/admin/{id}/approve': {
    put: {
      tags: ['Withdrawals'],
      summary: 'Duyệt yêu cầu rút tiền (Admin)',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': { description: 'Yêu cầu đã được duyệt' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/withdrawals/admin/{id}/reject': {
    put: {
      tags: ['Withdrawals'],
      summary: 'Từ chối yêu cầu rút tiền (Admin)',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { rejectionReason: { type: 'string', nullable: true } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Yêu cầu bị từ chối' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/withdrawals/admin/{id}/complete': {
    put: {
      tags: ['Withdrawals'],
      summary: 'Đánh dấu hoàn thành chuyển khoản (Admin)',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { transactionReference: { type: 'string', nullable: true } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Đánh dấu hoàn thành' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/withdrawals/admin/{id}/fail': {
    put: {
      tags: ['Withdrawals'],
      summary: 'Đánh dấu chuyển khoản thất bại (Admin)',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { reason: { type: 'string', nullable: true } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Đánh dấu thất bại' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // ══════════════════ NOTIFICATIONS ══════════════════
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Lấy tất cả thông báo của người dùng',
      security: auth,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': {
          description: 'Danh sách thông báo',
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
                        title: { type: 'string' },
                        body: { type: 'string' },
                        isRead: { type: 'boolean' },
                        type: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
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

  '/notifications/{id}': {
    patch: {
      tags: ['Notifications'],
      summary: 'Đánh dấu thông báo đã đọc',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': { description: 'Thông báo đã được đánh dấu là đã đọc' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ DASHBOARD (Admin) ══════════════════
  '/admin/dashboard/overview': {
    get: {
      tags: ['Dashboard (Admin)'],
      summary: 'Tổng quan — 4 KPI cards (Admin)',
      description: 'Trả về: tổng người dùng, người dùng mới, doanh thu, bài thi hoàn thành trong tháng.',
      security: auth,
      responses: {
        '200': { description: 'KPI tổng quan' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/dashboard/users': {
    get: {
      tags: ['Dashboard (Admin)'],
      summary: 'Phân tích người dùng (Admin)',
      security: auth,
      responses: {
        '200': { description: 'Thống kê người dùng' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/dashboard/learning': {
    get: {
      tags: ['Dashboard (Admin)'],
      summary: 'Phân tích học tập — categories, topics, words (Admin)',
      security: auth,
      responses: {
        '200': { description: 'Thống kê học tập' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/dashboard/revenue': {
    get: {
      tags: ['Dashboard (Admin)'],
      summary: 'Phân tích doanh thu (Admin)',
      security: auth,
      responses: {
        '200': { description: 'Thống kê doanh thu' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/dashboard/exams': {
    get: {
      tags: ['Dashboard (Admin)'],
      summary: 'Phân tích bài thi (Admin)',
      security: auth,
      responses: {
        '200': { description: 'Thống kê bài thi' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/admin/dashboard/activities': {
    get: {
      tags: ['Dashboard (Admin)'],
      summary: 'Hoạt động gần đây (Admin)',
      security: auth,
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        '200': { description: 'Danh sách hoạt động gần đây' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  // ══════════════════ AI CHATBOT ══════════════════
  '/chat': {
    post: {
      tags: ['AI Chatbot'],
      summary: 'Gửi tin nhắn đến AI chatbot (RAG)',
      description: 'Chatbot trả lời câu hỏi về tiếng Anh. Hỗ trợ session liên tục. Không bắt buộc đăng nhập.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/SendChatBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Phản hồi của chatbot',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      sessionId: { type: 'string' },
                      reply: { type: 'string', example: '"Affect" là động từ, còn "Effect" thường là danh từ...' },
                    },
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

  '/chat/sessions': {
    get: {
      tags: ['AI Chatbot'],
      summary: 'Lấy danh sách phiên chatbot của người dùng',
      security: auth,
      responses: {
        '200': { description: 'Danh sách phiên chat' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/chat/sessions/{sessionId}/messages': {
    get: {
      tags: ['AI Chatbot'],
      summary: 'Lấy lịch sử tin nhắn trong một phiên chat',
      parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Lịch sử tin nhắn' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/chat/sessions/{sessionId}': {
    delete: {
      tags: ['AI Chatbot'],
      summary: 'Xoá phiên chat',
      security: auth,
      parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Xoá thành công' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  // ══════════════════ TRANSLATE ══════════════════
  '/translate/phrase': {
    post: {
      tags: ['Translate'],
      summary: 'Dịch câu / đoạn văn (Public)',
      description: 'Dịch cụm từ hoặc đoạn văn. Không phải tra từ điển đơn lẻ — dùng `/words/dictionary` cho tra từ.',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/TranslatePhraseBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Kết quả dịch',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      translatedText: { type: 'string', example: 'Thời tiết hôm nay thật đẹp.' },
                      sourceLang: { type: 'string', example: 'en' },
                      targetLang: { type: 'string', example: 'vi' },
                    },
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

  // ══════════════════ UPLOAD ══════════════════
  '/uploads/signed-url': {
    get: {
      tags: ['Upload'],
      summary: 'Lấy signed URL để upload trực tiếp lên Cloudinary',
      security: auth,
      parameters: [
        { name: 'folder', in: 'query', schema: { type: 'string', default: 'lingora' }, description: 'Thư mục trên Cloudinary' },
      ],
      responses: {
        '200': {
          description: 'Signed URL',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      uploadUrl: { type: 'string', format: 'uri' },
                      apiKey: { type: 'string' },
                      signature: { type: 'string' },
                      timestamp: { type: 'integer' },
                      folder: { type: 'string' },
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

  '/uploads/image': {
    post: {
      tags: ['Upload'],
      summary: 'Upload ảnh qua server lên Cloudinary',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary', description: 'File ảnh (jpg, png, webp, ...)' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'URL ảnh đã upload',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: { url: { type: 'string', format: 'uri' } },
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
  },

  '/uploads/audio': {
    post: {
      tags: ['Upload'],
      summary: 'Upload file âm thanh qua server lên Cloudinary',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary', description: 'File âm thanh (mp3, wav, ogg, ...)' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'URL âm thanh đã upload',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: { url: { type: 'string', format: 'uri' } },
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

  '/uploads/file': {
    post: {
      tags: ['Upload'],
      summary: 'Upload file tổng quát (PDF, DOCX, ZIP, ...) cho classroom chat',
      description: 'Giới hạn 20 MB. Dùng cho đính kèm trong chat classroom.',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Thông tin file đã upload',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      url: { type: 'string', format: 'uri' },
                      name: { type: 'string' },
                      size: { type: 'integer', description: 'Kích thước bytes' },
                      mimeType: { type: 'string' },
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
  },

  // ══════════════════ VNPAY ══════════════════
  '/vnpay/return': {
    get: {
      tags: ['Payments (VNPay)'],
      summary: 'VNPay redirect callback sau thanh toán',
      description: 'VNPay redirect người dùng về đây sau khi thanh toán. Webapp nhận redirect, mobile nhận JSON.',
      parameters: [
        { name: 'vnp_ResponseCode', in: 'query', schema: { type: 'string' }, description: '00 = thành công' },
        { name: 'vnp_TxnRef', in: 'query', schema: { type: 'string' }, description: 'Mã giao dịch' },
        { name: 'vnp_Amount', in: 'query', schema: { type: 'string' }, description: 'Số tiền × 100' },
        { name: 'vnp_SecureHash', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Xử lý thanh toán thành công (JSON cho mobile)' },
        '302': { description: 'Redirect về frontend webapp' },
      },
    },

    post: {
      tags: ['Payments (VNPay)'],
      summary: 'VNPay return (POST variant)',
      responses: {
        '200': { description: 'Xử lý thanh toán' },
      },
    },
  },

  '/vnpay/ipn': {
    get: {
      tags: ['Payments (VNPay)'],
      summary: 'VNPay IPN webhook (server-to-server)',
      description: 'VNPay gọi endpoint này để xác nhận giao dịch phía server. Không gọi endpoint này trực tiếp.',
      parameters: [
        { name: 'vnp_ResponseCode', in: 'query', schema: { type: 'string' } },
        { name: 'vnp_TxnRef', in: 'query', schema: { type: 'string' } },
        { name: 'vnp_SecureHash', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: '{"RspCode":"00","Message":"Confirm Success"}' },
      },
    },
  },

  // ══════════════════ ADAPTIVE TEST ══════════════════
  '/adaptive-test/questions': {
    get: {
      tags: ['Adaptive Test'],
      summary: 'Lấy ngân hàng câu hỏi kiểm tra đầu vào (Public)',
      description: 'Dùng để hiển thị bài kiểm tra trình độ đầu vào cho người dùng mới.',
      responses: {
        '200': {
          description: 'Ngân hàng câu hỏi',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
      },
    },
  },

  '/adaptive-test/next': {
    post: {
      tags: ['Adaptive Test'],
      summary: 'Lấy câu hỏi tiếp theo trong kiểm tra thích nghi',
      description: 'Truyền toàn bộ câu hỏi đã trả lời. Thuật toán chọn câu tiếp theo phù hợp. Truyền mảng rỗng cho câu đầu tiên.',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AdaptiveTestNextBody' } },
        },
      },
      responses: {
        '200': {
          description: 'Câu hỏi tiếp theo hoặc kết quả cuối',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { data: { type: 'object' } } },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
}
