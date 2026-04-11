import { IsNotEmpty, IsString } from "class-validator"

export class JoinClassroomBodyReq {
    @IsString()
    @IsNotEmpty()
    code: string
}
