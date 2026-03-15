import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
    @IsInt()
    @IsNotEmpty()
    contextId!: number;
}

export class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    question!: string;
}
