import { ProficiencyLevel } from "../../../enums/proficiency.enum"

export interface CreateUserBodyReq {
  username: string
  email: string
  password: string
  avatar?: string
  roleIds: number[],
  proficiency?: ProficiencyLevel | null
}