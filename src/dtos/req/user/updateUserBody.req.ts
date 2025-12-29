import { ProficiencyLevel } from "~/enums/proficiency.enum"
import { UserStatus } from "~/enums/userStatus.enum"

export interface UpdateUserBodyReq {
  username?: string,
  email?: string,
  newPassword?: string,
  oldPassword?: string,
  avatar?: string,
  roleIds?: number[],
  proficiency?: ProficiencyLevel | null,
  status?: UserStatus,
  banReason?: string | null,
  suspendedUntil?: Date | null
}