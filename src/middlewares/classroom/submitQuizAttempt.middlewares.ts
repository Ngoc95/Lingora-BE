import { SubmitQuizAttemptBodyReq } from "~/dtos/req/classroom/submitQuizAttemptBody.req"
import { dtoValidation } from "../dtoValidation.middleware"

export const submitQuizAttemptValidation = dtoValidation(SubmitQuizAttemptBodyReq)
