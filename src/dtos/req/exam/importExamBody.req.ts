import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import {
  ExamGroupType,
  ExamQuestionType,
  ExamSectionType,
  ExamType,
} from "~/enums/exam.enum";

export class ImportExamQuestionReq {
  @IsEnum(ExamQuestionType)
  questionType: ExamQuestionType;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsArray()
  options?: Array<string | Record<string, unknown>>;

  @IsOptional()
  correctAnswer?: any;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsNumber()
  scoreWeight?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ImportExamQuestionGroupReq {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  resourceUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportExamQuestionReq)
  questions: ImportExamQuestionReq[];
}

export class ImportExamSectionGroupReq {
  @IsEnum(ExamGroupType)
  groupType: ExamGroupType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  resourceUrl?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportExamQuestionGroupReq)
  questionGroups: ImportExamQuestionGroupReq[];
}

export class ImportExamSectionReq {
  @IsEnum(ExamSectionType)
  sectionType: ExamSectionType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportExamSectionGroupReq)
  groups: ImportExamSectionGroupReq[];
}

export class ImportExamBodyReq {
  @IsEnum(ExamType)
  examType: ExamType;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalDurationSeconds?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportExamSectionReq)
  sections: ImportExamSectionReq[];
}

export type ImportExamBulkBodyReq = ImportExamBodyReq[];
