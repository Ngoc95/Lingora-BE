import { DeepPartial, In } from "typeorm";
import { DatabaseService } from "./database.service";
import { Exam } from "~/entities/exam.entity";
import { ExamSection } from "~/entities/examSection.entity";
import { ExamSectionGroup } from "~/entities/examSectionGroup.entity";
import { ExamQuestion } from "~/entities/examQuestion.entity";
import { ExamAttempt } from "~/entities/examAttempt.entity";
import { ExamAttemptAnswer } from "~/entities/examAttemptAnswer.entity";
import {
  ExamAttemptStatus,
  ExamMode,
  ExamSectionType,
  ExamType,
} from "~/enums/exam.enum";
import { BadRequestError, NotFoundRequestError } from "~/core/error.response";
import { StartExamAttemptBodyReq } from "~/dtos/req/exam/startExamAttemptBody.req";
import { SubmitExamSectionBodyReq } from "~/dtos/req/exam/submitExamSectionBody.req";
import {
  ImportExamBodyReq,
  ImportExamSectionGroupReq,
  ImportExamSectionReq,
} from "~/dtos/req/exam/importExamBody.req";
import { GetExamListQueryReq } from "~/dtos/req/exam/getExamListQuery.req";
import {
  DEFAULT_SECTION_SCORE_KEY,
  IELTS_LISTENING_BAND_TABLE,
  IELTS_READING_ACADEMIC_BAND_TABLE,
  IELTS_READING_GENERAL_BAND_TABLE,
  computeBandFromTable,
} from "~/constants/exam";

const DEFAULT_LIMIT = 10;

class ExamService {
  private db = DatabaseService.getInstance();

  listExams = async (query: GetExamListQueryReq) => {
    const examRepo = await this.db.getRepository(Exam);
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit =
      Number(query.limit) > 0
        ? Math.min(Number(query.limit), 50)
        : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const qb = examRepo
      .createQueryBuilder("exam")
      .leftJoinAndSelect("exam.sections", "section")
      .skip(skip)
      .take(limit)
      .orderBy("exam.createdAt", "DESC");

    if (query.examType) {
      qb.andWhere("exam.examType = :examType", { examType: query.examType });
    }

    if (query.isPublished !== undefined) {
      qb.andWhere("exam.isPublished = :isPublished", {
        isPublished: query.isPublished,
      });
    }

    if (query.search) {
      qb.andWhere(
        "(LOWER(exam.title) ILIKE :search OR LOWER(exam.description) ILIKE :search)",
        {
          search: `%${query.search.toLowerCase()}%`,
        }
      );
    }

    const [exams, total] = await qb.getManyAndCount();

    const sanitized = exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      code: exam.code,
      examType: exam.examType,
      level: exam.level,
      totalDurationSeconds: exam.totalDurationSeconds,
      thumbnailUrl: exam.thumbnailUrl,
      isPublished: exam.isPublished,
      sections: exam.sections
        ?.sort((a, b) => a.displayOrder - b.displayOrder)
        .map((section) => ({
          id: section.id,
          title: section.title,
          sectionType: section.sectionType,
          displayOrder: section.displayOrder,
          durationSeconds: section.durationSeconds,
        })),
    }));

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      exams: sanitized,
    };
  };

  getExamDetail = async (examId: number) => {
    const examRepo = await this.db.getRepository(Exam);
    const exam = await examRepo.findOne({
      where: { id: examId },
      relations: ["sections"],
    });

    if (!exam) {
      throw new NotFoundRequestError("Exam not found");
    }

    return {
      id: exam.id,
      title: exam.title,
      code: exam.code,
      examType: exam.examType,
      description: exam.description,
      level: exam.level,
      totalDurationSeconds: exam.totalDurationSeconds,
      thumbnailUrl: exam.thumbnailUrl,
      isPublished: exam.isPublished,
      metadata: exam.metadata,
      sections: exam.sections
        ?.sort((a, b) => a.displayOrder - b.displayOrder)
        .map((section) => ({
          id: section.id,
          title: section.title,
          sectionType: section.sectionType,
          displayOrder: section.displayOrder,
          durationSeconds: section.durationSeconds,
          instructions: section.instructions,
          audioUrl: section.audioUrl,
        })),
    };
  };

  getSectionDetail = async (
    examId: number,
    sectionId: number,
    includeCorrectAnswer = false
  ) => {
    const sectionRepo = await this.db.getRepository(ExamSection);
    const section = await sectionRepo.findOne({
      where: { id: sectionId, exam: { id: examId } },
      relations: ["exam", "questionGroups", "questionGroups.questions"],
    });

    if (!section) {
      throw new NotFoundRequestError("Section not found");
    }

    return this.sanitizeSection(section, includeCorrectAnswer);
  };

  startExamAttempt = async (
    userId: number,
    examId: number,
    body: StartExamAttemptBodyReq
  ) => {
    const examRepo = await this.db.getRepository(Exam);
    const attemptRepo = await this.db.getRepository(ExamAttempt);

    const exam = await examRepo.findOne({
      where: { id: examId },
      relations: ["sections"],
    });

    if (!exam) {
      throw new NotFoundRequestError("Exam not found");
    }

    if (!exam.isPublished) {
      throw new BadRequestError({ message: "Exam is not published yet" });
    }

    const mode = body.mode || ExamMode.SECTION;
    let targetSectionId: number | undefined;

    if (mode === ExamMode.SECTION) {
      if (!body.sectionId) {
        throw new BadRequestError({
          message: "Section ID is required for section mode",
        });
      }

      const sectionExists = exam.sections?.some(
        (section) => section.id === body.sectionId
      );
      if (!sectionExists) {
        throw new BadRequestError({
          message: "Section does not belong to this exam",
        });
      }
      targetSectionId = body.sectionId;
    }

    if (body.resumeLast) {
      const existingAttempt = await attemptRepo.findOne({
        where: {
          exam: { id: exam.id },
          user: { id: userId },
          status: ExamAttemptStatus.IN_PROGRESS,
          mode,
          ...(targetSectionId ? { targetSectionId } : {}),
        },
        relations: ["exam"],
      });

      if (existingAttempt) {
        return existingAttempt;
      }
    }

    const attempt = attemptRepo.create({
      exam,
      user: { id: userId } as any,
      mode,
      targetSectionId,
      sectionProgress: {},
      scoreSummary: {},
    });

    return attemptRepo.save(attempt);
  };

  submitSectionAttempt = async (
    attemptId: number,
    sectionId: number,
    userId: number,
    payload: SubmitExamSectionBodyReq
  ) => {
    const attemptRepo = await this.db.getRepository(ExamAttempt);
    const answerRepo = await this.db.getRepository(ExamAttemptAnswer);
    const sectionRepo = await this.db.getRepository(ExamSection);

    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
      relations: ["exam", "user"],
    });

    if (!attempt) {
      throw new NotFoundRequestError("Attempt not found");
    }

    if (attempt.user.id !== userId) {
      throw new BadRequestError({
        message: "You are not allowed to update this attempt",
      });
    }

    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestError({ message: "Attempt is already finalized" });
    }

    if (
      attempt.mode === ExamMode.SECTION &&
      attempt.targetSectionId !== sectionId
    ) {
      throw new BadRequestError({
        message: "This attempt is locked to another section",
      });
    }

    const section = await sectionRepo.findOne({
      where: { id: sectionId, exam: { id: attempt.exam.id } },
      relations: ["questionGroups", "questionGroups.questions"],
    });

    if (!section) {
      throw new NotFoundRequestError("Section not found");
    }

    if (!payload.answers || payload.answers.length === 0) {
      throw new BadRequestError({ message: "Answers payload is empty" });
    }

    const questionIds = section.questionGroups.flatMap(
      (group) => group.questions?.map((question) => question.id) || []
    );

    const answersMap = new Map(
      payload.answers.map((item) => [item.questionId, item.answer])
    );

    const existingAnswers = await answerRepo.find({
      where: {
        attempt: { id: attempt.id },
        question: { id: In(questionIds) },
      },
      relations: ["question"],
    });

    const existingMap = new Map(
      existingAnswers.map((item) => [item.question.id, item])
    );

    let correctCount = 0;
    let answeredCount = 0;
    let earnedScore = 0;

    const answersToSave: ExamAttemptAnswer[] = [];

    for (const group of section.questionGroups) {
      for (const question of group.questions || []) {
        const rawAnswer = answersMap.get(question.id);
        let normalizedAnswer =
          typeof rawAnswer === "undefined" ? null : rawAnswer;
        const isObjective = this.isObjectiveQuestion(question);
        let isCorrect: boolean | undefined = undefined;
        let score: number | undefined = undefined;

        if (normalizedAnswer !== null) {
          answeredCount += 1;
        }

        if (isObjective && normalizedAnswer !== null) {
          isCorrect = this.compareAnswer(
            question.correctAnswer,
            normalizedAnswer
          );
          score = isCorrect ? question.scoreWeight : 0;
          if (isCorrect) {
            correctCount += 1;
            earnedScore += question.scoreWeight;
          }
        } else if (isObjective) {
          score = 0;
        }

        const answerEntity =
          existingMap.get(question.id) ||
          answerRepo.create({
            attempt: { id: attempt.id } as any,
            question: { id: question.id } as any,
            section: { id: section.id } as any,
          });

        answerEntity.answerPayload = normalizedAnswer;
        answerEntity.isCorrect = isCorrect;
        answerEntity.score = typeof score === "number" ? score : undefined;
        answersToSave.push(answerEntity);
      }
    }

    await answerRepo.save(answersToSave);

    const totalQuestions = questionIds.length;
    const progressSnapshot = {
      status: "COMPLETED",
      submittedAt: new Date().toISOString(),
      answeredCount,
      correctCount,
      totalQuestions,
      earnedScore,
    };

    const updatedProgress = { ...(attempt.sectionProgress || {}) };
    updatedProgress[section.id] = progressSnapshot;
    attempt.sectionProgress = updatedProgress;

    await attemptRepo.save(attempt);

    return {
      sectionId: section.id,
      sectionType: section.sectionType,
      ...progressSnapshot,
    };
  };

  finalizeAttempt = async (attemptId: number, userId: number) => {
    const attemptRepo = await this.db.getRepository(ExamAttempt);
    const answerRepo = await this.db.getRepository(ExamAttemptAnswer);

    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
      relations: ["exam", "exam.sections", "user"],
    });

    if (!attempt) {
      throw new NotFoundRequestError("Attempt not found");
    }

    if (attempt.user.id !== userId) {
      throw new BadRequestError({
        message: "You are not allowed to finalize this attempt",
      });
    }

    if (attempt.status === ExamAttemptStatus.SUBMITTED) {
      throw new BadRequestError({ message: "Attempt already submitted" });
    }

    if (attempt.mode === ExamMode.FULL) {
      const totalSections = attempt.exam.sections?.length || 0;
      const completedSectionIds = Object.entries(attempt.sectionProgress || {})
        .filter(([, value]: any) => value?.status === "COMPLETED")
        .map(([key]) => Number(key));

      if (totalSections > 0 && completedSectionIds.length < totalSections) {
        throw new BadRequestError({
          message: "Please submit every section before finalizing the test",
        });
      }
    } else if (attempt.mode === ExamMode.SECTION && attempt.targetSectionId) {
      const snapshot = attempt.sectionProgress?.[attempt.targetSectionId];
      if (!snapshot || snapshot.status !== "COMPLETED") {
        throw new BadRequestError({ message: "Section answers are missing" });
      }
    }

    const answers = await answerRepo.find({
      where: { attempt: { id: attempt.id } },
      relations: ["question", "question.group", "section"],
    });

    const scoreSummary = this.buildScoreSummary(attempt.exam, answers);

    attempt.scoreSummary = scoreSummary;
    attempt.status = ExamAttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();

    await attemptRepo.save(attempt);

    return {
      attemptId: attempt.id,
      examId: attempt.exam.id,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      scoreSummary,
    };
  };

  listAttempts = async (userId: number) => {
    const attemptRepo = await this.db.getRepository(ExamAttempt);
    const attempts = await attemptRepo.find({
      where: { user: { id: userId } },
      relations: ["exam"],
      order: { createdAt: "DESC" },
    });

    return attempts.map((attempt) => ({
      id: attempt.id,
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        examType: attempt.exam.examType,
        code: attempt.exam.code,
      },
      mode: attempt.mode,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      scoreSummary: attempt.scoreSummary,
    }));
  };

  getAttemptDetail = async (attemptId: number, userId: number) => {
    const attemptRepo = await this.db.getRepository(ExamAttempt);
    const answerRepo = await this.db.getRepository(ExamAttemptAnswer);

    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
      relations: ["exam", "user"],
    });

    if (!attempt) {
      throw new NotFoundRequestError("Attempt not found");
    }

    if (attempt.user.id !== userId) {
      throw new BadRequestError({
        message: "You are not allowed to view this attempt",
      });
    }

    const answers = await answerRepo.find({
      where: { attempt: { id: attemptId } },
      relations: ["question", "question.group", "section"],
    });

    const sectionsMap = new Map<
      number,
      {
        id: number;
        title: string;
        sectionType: ExamSectionType;
        groups: Map<
          number,
          {
            id: number;
            title: string;
            groupType: string;
            questions: any[];
          }
        >;
      }
    >();

    for (const answer of answers) {
      const section = answer.section;
      if (!sectionsMap.has(section.id)) {
        sectionsMap.set(section.id, {
          id: section.id,
          title: section.title,
          sectionType: section.sectionType,
          groups: new Map(),
        });
      }

      const sectionBucket = sectionsMap.get(section.id)!;
      const group = answer.question.group;

      if (!sectionBucket.groups.has(group.id)) {
        sectionBucket.groups.set(group.id, {
          id: group.id,
          title: group.title,
          groupType: group.groupType,
          questions: [],
        });
      }

      const groupBucket = sectionBucket.groups.get(group.id)!;

      groupBucket.questions.push({
        questionId: answer.question.id,
        prompt: answer.question.prompt,
        questionType: answer.question.questionType,
        options: answer.question.options,
        correctAnswer: answer.question.correctAnswer,
        explanation: answer.question.explanation,
        userAnswer: answer.answerPayload,
        isCorrect: answer.isCorrect,
        score: answer.score,
        aiFeedback: answer.aiFeedback,
      });
    }

    const sections = Array.from(sectionsMap.values()).map((section) => ({
      id: section.id,
      title: section.title,
      sectionType: section.sectionType,
      groups: Array.from(section.groups.values()),
    }));

    return {
      attempt: {
        id: attempt.id,
        mode: attempt.mode,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        examType: attempt.exam.examType,
        code: attempt.exam.code,
      },
      scoreSummary: attempt.scoreSummary,
      sections,
    };
  };

  importExam = async (payload: ImportExamBodyReq) => {
    const examRepo = await this.db.getRepository(Exam);

    const existing = await examRepo.findOne({ where: { code: payload.code } });
    if (existing) {
      throw new BadRequestError({ message: "Exam code already exists" });
    }

    const examEntity = examRepo.create({
      examType: payload.examType,
      code: payload.code,
      title: payload.title,
      description: payload.description,
      level: payload.level,
      totalDurationSeconds: payload.totalDurationSeconds ?? 0,
      thumbnailUrl: payload.thumbnailUrl,
      metadata: payload.metadata || {},
      isPublished: payload.isPublished ?? false,
      sections:
        payload.sections?.map((section, sIndex) =>
          this.mapSectionPayload(section, sIndex)
        ) || [],
    } as DeepPartial<Exam>);

    const saved = await examRepo.save(examEntity);

    return this.getExamDetail(saved.id);
  };

  private sanitizeSection(section: ExamSection, includeCorrectAnswer: boolean) {
    return {
      id: section.id,
      title: section.title,
      sectionType: section.sectionType,
      displayOrder: section.displayOrder,
      durationSeconds: section.durationSeconds,
      instructions: section.instructions,
      audioUrl: section.audioUrl,
      metadata: section.metadata,
      groups: (section.questionGroups || [])
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((group) => ({
          id: group.id,
          title: group.title,
          description: group.description,
          content: group.content,
          resourceUrl: group.resourceUrl,
          displayOrder: group.displayOrder,
          groupType: group.groupType,
          questions: (group.questions || []).map((question) => {
            const sanitized: Record<string, any> = {
              id: question.id,
              prompt: question.prompt,
              questionType: question.questionType,
              options: question.options,
              metadata: question.metadata,
            };

            if (includeCorrectAnswer) {
              sanitized.correctAnswer = question.correctAnswer;
              sanitized.explanation = question.explanation;
            }

            return sanitized;
          }),
        })),
    };
  }

  private isObjectiveQuestion(question: ExamQuestion) {
    return (
      typeof question.correctAnswer !== "undefined" &&
      question.correctAnswer !== null
    );
  }

  private compareAnswer(correctAnswer: any, submitted: any) {
    if (correctAnswer === null || typeof correctAnswer === "undefined") {
      return false;
    }

    if (typeof correctAnswer === "string") {
      if (typeof submitted !== "string") return false;
      return (
        correctAnswer.trim().toLowerCase() === submitted.trim().toLowerCase()
      );
    }

    if (Array.isArray(correctAnswer)) {
      if (!Array.isArray(submitted)) return false;
      if (correctAnswer.length !== submitted.length) return false;
      const normalizedCorrect = correctAnswer.map((item) =>
        typeof item === "string" ? item.trim().toLowerCase() : item
      );
      const normalizedSubmitted = submitted.map((item) =>
        typeof item === "string" ? item.trim().toLowerCase() : item
      );
      return normalizedCorrect.every(
        (value, index) => value === normalizedSubmitted[index]
      );
    }

    return JSON.stringify(correctAnswer) === JSON.stringify(submitted);
  }

  private buildScoreSummary(exam: Exam, answers: ExamAttemptAnswer[]) {
    const sectionsSummary: Record<
      number,
      {
        sectionType: ExamSectionType;
        correctCount: number;
        totalQuestions: number;
        earnedScore: number;
        band?: number;
      }
    > = {};

    for (const answer of answers) {
      const sectionId = answer.section.id;
      if (!sectionsSummary[sectionId]) {
        sectionsSummary[sectionId] = {
          sectionType: answer.section.sectionType,
          correctCount: 0,
          totalQuestions: 0,
          earnedScore: 0,
        };
      }

      const bucket = sectionsSummary[sectionId];
      bucket.totalQuestions += 1;

      if (answer.isCorrect) {
        bucket.correctCount += 1;
        bucket.earnedScore += answer.score || 0;
      }
    }

    if (exam.examType === ExamType.IELTS) {
      for (const [sectionId, summary] of Object.entries(sectionsSummary)) {
        const numericSectionId = Number(sectionId);
        const sectionType = summary.sectionType;
        if (sectionType === ExamSectionType.LISTENING) {
          summary.band = computeBandFromTable(
            summary.correctCount,
            IELTS_LISTENING_BAND_TABLE
          );
        } else if (sectionType === ExamSectionType.READING) {
          const variant =
            exam.metadata?.readingVariant === "GENERAL"
              ? "GENERAL"
              : "ACADEMIC";
          summary.band = computeBandFromTable(
            summary.correctCount,
            variant === "GENERAL"
              ? IELTS_READING_GENERAL_BAND_TABLE
              : IELTS_READING_ACADEMIC_BAND_TABLE
          );
        }
        sectionsSummary[numericSectionId] = summary;
      }
    }

    const totals = Object.values(sectionsSummary).reduce(
      (acc, item) => {
        acc.totalQuestions += item.totalQuestions;
        acc.totalCorrect += item.correctCount;
        acc.totalScore += item.earnedScore;
        return acc;
      },
      { totalQuestions: 0, totalCorrect: 0, totalScore: 0 }
    );

    const bands: Record<string, number | null> = {
      listening: null,
      reading: null,
      writing: null,
      speaking: null,
      overall: null,
    };

    for (const summary of Object.values(sectionsSummary)) {
      const key = DEFAULT_SECTION_SCORE_KEY[summary.sectionType] || "general";
      if (typeof summary.band === "number") {
        bands[key] = summary.band;
      }
    }

    const availableBands = ["listening", "reading", "writing", "speaking"]
      .map((key) => bands[key])
      .filter((value): value is number => typeof value === "number");

    if (exam.examType === ExamType.IELTS && availableBands.length > 0) {
      const raw =
        availableBands.reduce((sum, band) => sum + band, 0) /
        availableBands.length;
      bands.overall = this.roundIeltsOverallBand(raw);
    }

    return {
      sections: sectionsSummary,
      totals,
      bands,
    };
  }

  private roundIeltsOverallBand(value: number) {
    const intPart = Math.floor(value);
    const decimal = value - intPart;

    if (decimal < 0.25) return intPart;
    if (decimal < 0.75) return intPart + 0.5;
    return intPart + 1;
  }

  private mapSectionPayload(
    section: ImportExamSectionReq,
    index: number
  ): DeepPartial<ExamSection> {
    return {
      title: section.title,
      sectionType: section.sectionType,
      displayOrder: section.displayOrder ?? index + 1,
      durationSeconds: section.durationSeconds ?? 0,
      instructions: section.instructions,
      audioUrl: section.audioUrl,
      metadata: section.metadata || {},
      questionGroups:
        section.groups?.map((group, gIndex) =>
          this.mapGroupPayload(group, gIndex)
        ) || [],
    };
  }

  private mapGroupPayload(
    group: ImportExamSectionGroupReq,
    index: number
  ): DeepPartial<ExamSectionGroup> {
    return {
      title: group.title,
      description: group.description,
      content: group.content,
      resourceUrl: group.resourceUrl,
      groupType: group.groupType,
      displayOrder: group.displayOrder ?? index + 1,
      metadata: group.metadata || {},
      questions:
        group.questions?.map((question, qIndex) =>
          this.mapQuestionPayload(question, qIndex)
        ) || [],
    };
  }

  private mapQuestionPayload(
    question: ImportExamSectionGroupReq["questions"][number],
    _index: number
  ): DeepPartial<ExamQuestion> {
    return {
      questionType: question.questionType,
      prompt: question.prompt,
      options: question.options || [],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      scoreWeight: question.scoreWeight ?? 1,
      metadata: question.metadata || {},
    };
  }
}

export const examService = new ExamService();
