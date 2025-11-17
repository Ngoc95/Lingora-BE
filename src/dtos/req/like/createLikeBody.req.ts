import { User } from '~/entities/user.entity'
import { TargetType } from '~/enums/targetType.enum'

export class CreateLikeBodyReq {
  user: User
  targetId: number
  targetType: TargetType
}
