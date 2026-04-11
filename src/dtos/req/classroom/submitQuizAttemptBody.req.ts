import { IsObject, IsString } from "class-validator"

export class SubmitQuizAttemptBodyReq {
    @IsObject()
    answers: Record<string, string>
}
