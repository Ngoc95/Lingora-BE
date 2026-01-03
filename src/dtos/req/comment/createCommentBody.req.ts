import { User } from '~/entities/user.entity'
import { TargetType } from '~/enums/targetType.enum'

export class CreateCommentBodyReq {
  content: string
  user: User
  targetId: number
  targetType: TargetType
  parentId: number | null
}
