import { User } from './entities/user.entity'
import 'express'

declare module 'express' {
  interface Request {
    user?: User
    decodedAuthorization?: Int
    decodedRefreshToken?: Int
    parseQueryBoolean?: Record<string, boolean>
    parseQueryPagination?: { page?: number; limit?: number }
    sortParsed?: Record<string, 'ASC' | 'DESC'>
    filterParsed?: Record<string, any>
  }
}
