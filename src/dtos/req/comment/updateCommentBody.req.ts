import { User } from '~/entities/user.entity'
import { TargetType } from '~/enums/targetType.enum'

export class UpdateCommentBodyReq {
  content: string
  user: User
  targetId: number
  targetType: TargetType
  commentId: number
}
