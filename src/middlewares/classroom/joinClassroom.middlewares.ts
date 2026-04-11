import { JoinClassroomBodyReq } from "~/dtos/req/classroom/joinClassroomBody.req"
import { dtoValidation } from "../dtoValidation.middleware"

export const joinClassroomValidation = dtoValidation(JoinClassroomBodyReq)
