import { FindOptionsOrder } from "typeorm"
import { User } from "~/entities/user.entity"
import { ProficiencyLevel } from "~/enums/proficiency.enum"
import { UserStatus } from "~/enums/userStatus.enum"

export interface UserQueryReq {
  page?: number
  limit?: number

  //filter
  search?: string
  proficiency?: ProficiencyLevel
  status?: UserStatus
  
  //sort
  sort?: FindOptionsOrder<User>
}