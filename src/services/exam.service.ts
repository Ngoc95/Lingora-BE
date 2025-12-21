import { DeepPartial, In } from "typeorm";
import { DatabaseService } from "./database.service";
import { Exam } from "~/entities/exam.entity";
import { ExamSection } from "~/entities/examSection.entity";
import { ExamSectionGroup } from "~/entities/examSectionGroup.entity";
import { ExamQuestionGroup } from "~/entities/examQuestionGroup.entity";
import { ExamQuestion } from "~/entities/examQuestion.entity";
import { ExamAttempt } from "~/entities/examAttempt.entity";
import { ExamAttemptAnswer } from "~/entities/examAttemptAnswer.entity";
import {
  ExamAttemptStatus,
  ExamMode,
  ExamSectionType,
  ExamType,
  ExamQuestionType,
} from "~/enums/exam.enum";
import { aiService } from "~/services/ai.service";
import { BadRequestError, NotFoundRequestError } from "~/core/error.response";
import { StartExamAttemptBodyReq } from "~/dtos/req/exam/startExamAttemptBody.req";
import { SubmitExamSectionBodyReq } from "~/dtos/req/exam/submitExamSectionBody.req";
import {
  ImportExamBodyReq,
  ImportExamSectionGroupReq,
  ImportExamQuestionGroupReq,
  ImportExamSectionReq,
  ImportExamBulkBodyReq,
} from "~/dtos/req/exam/importExamBody.req";
import { GetExamListQueryReq } from "~/dtos/req/exam/getExamListQuery.req";
import { UpdateExamBodyReq } from "~/dtos/req/exam/updateExamBody.req";
import { AdminGetExamAttemptsQueryReq } from "~/dtos/req/exam/adminGetExamAttemptsQuery.req";
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

  getExamDetail = async (examId: number, userId?: number | null) => {
    const examRepo = await this.db.getRepository(Exam);
    const exam = await examRepo.findOne({
      where: { id: examId },
      relations: ["sections"],
    });

    if (!exam) {
      throw new NotFoundRequestError("Exam not found");
    }

    let sectionProgress: Record<string, any> = {};
    if (userId) {
      const attemptRepo = await this.db.getRepository(ExamAttempt);
      const attempts = await attemptRepo.find({
        where: {
          exam: { id: examId },
          user: { id: userId },
        },
      });

      attempts.forEach((attempt) => {
        const p = attempt.sectionProgress || {};
        Object.keys(p).forEach((sectionId) => {
          const existing = sectionProgress[sectionId];
          const current = p[sectionId];

          if (
            !existing ||
            (current.status === "COMPLETED" && existing.status !== "COMPLETED")
          ) {
            sectionProgress[sectionId] = current;
          }
        });
      });
    }
    return {
      id: exam.id,
      title: exam.title,
      code: exam.code,
      examType: exam.examType,

      description: exam.description,
      totalDurationSeconds: exam.totalDurationSeconds,
      thumbnailUrl: exam.thumbnailUrl,
      isPublished: exam.isPublished,
      metadata: exam.metadata,
      sections: exam.sections
        ?.sort((a, b) => a.displayOrder - b.displayOrder)
        .map((section) => {
          const progress = sectionProgress[section.id] || {};
          return {
            id: section.id,
            title: section.title,
            sectionType: section.sectionType,
            displayOrder: section.displayOrder,
            durationSeconds: section.durationSeconds,
            instructions: section.instructions,
            audioUrl: section.audioUrl,
            status: progress.status || "NOT_STARTED", // "COMPLETED" | "NOT_STARTED"
          };
        }),
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
      relations: [
        "exam",
        "questionGroups",
        "questionGroups.questionGroups", // Load the new deeper level
        "questionGroups.questionGroups.questions",
      ],
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
      relations: [
        "questionGroups",
        "questionGroups.questionGroups",
        "questionGroups.questionGroups.questions",
      ],
    });

    if (!section) {
      throw new NotFoundRequestError("Section not found");
    }

    if (!payload.answers || payload.answers.length === 0) {
      throw new BadRequestError({ message: "Answers payload is empty" });
    }

    const questionIds = section.questionGroups
      .flatMap((g) => g.questionGroups || [])
      .flatMap((g) => g.questions || [])
      .map((q) => q.id);

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

    // Traverse 4 levels: Section -> SectionGroup -> QuestionGroup -> Question
    for (const sectionGroup of section.questionGroups) {
      for (const questionGroup of sectionGroup.questionGroups || []) {
        for (const question of questionGroup.questions || []) {
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

          // Ensure question details (type, prompt) are available for AI grading
          answerEntity.question = question;

          answerEntity.answerPayload = normalizedAnswer;
          answerEntity.isCorrect = isCorrect;
          answerEntity.score = typeof score === "number" ? score : undefined;
          answersToSave.push(answerEntity);
        }
      }
    }

    await answerRepo.save(answersToSave);

    // Trigger Async AI Grading
    this.triggerAsyncGrading(attempt, answersToSave).catch((err) =>
      console.error("Async Grading Error:", err)
    );

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

  listAttempts = async (
    userId: number,
    query?: { page?: number; limit?: number }
  ) => {
    const attemptRepo = await this.db.getRepository(ExamAttempt);
    const page = Number(query?.page) > 0 ? Number(query?.page) : 1;
    const limit = Number(query?.limit) > 0 ? Math.min(Number(query?.limit), 50) : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [attempts, total] = await attemptRepo.findAndCount({
      where: { user: { id: userId }, status: ExamAttemptStatus.SUBMITTED },
      relations: ["exam"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    const items = attempts.map((attempt) => ({
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

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      attempts: items,
    };
  };

  getAttemptDetail = async (attemptId: number, userId?: number) => {
    const attemptRepo = await this.db.getRepository(ExamAttempt);
    const answerRepo = await this.db.getRepository(ExamAttemptAnswer);

    const attempt = await attemptRepo.findOne({
      where: { id: attemptId },
      relations: ["exam", "user"],
    });

    if (!attempt) {
      throw new NotFoundRequestError("Attempt not found");
    }

    if (userId && attempt.user.id !== userId) {
      throw new BadRequestError({
        message: "You are not allowed to view this attempt",
      });
    }

    const answers = await answerRepo.find({
      where: { attempt: { id: attemptId } },
      relations: [
        "question",
        "question.group",
        "question.group.sectionGroup",
        "section",
      ],
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
            questionGroups: Map<
              number,
              {
                id: number;
                title: string;
                description?: string;
                questions: any[];
              }
            >;
          }
        >;
      }
    >();

    for (const answer of answers) {
      const section = answer.section;
      const question = answer.question;
      const questionGroup = question.group;
      const sectionGroup = questionGroup.sectionGroup;

      if (!sectionsMap.has(section.id)) {
        sectionsMap.set(section.id, {
          id: section.id,
          title: section.title,
          sectionType: section.sectionType,
          groups: new Map(),
        });
      }

      const sectionBucket = sectionsMap.get(section.id)!;

      if (!sectionBucket.groups.has(sectionGroup.id)) {
        sectionBucket.groups.set(sectionGroup.id, {
          id: sectionGroup.id,
          title: sectionGroup.title,
          groupType: sectionGroup.groupType,
          questionGroups: new Map(),
        });
      }

      const groupBucket = sectionBucket.groups.get(sectionGroup.id)!;

      if (!groupBucket.questionGroups.has(questionGroup.id)) {
        groupBucket.questionGroups.set(questionGroup.id, {
          id: questionGroup.id,
          title: questionGroup.title,
          description: questionGroup.description,
          questions: [],
        });
      }

      const qGroupBucket = groupBucket.questionGroups.get(questionGroup.id)!;

      qGroupBucket.questions.push({
        questionId: question.id,
        prompt: question.prompt,
        questionType: question.questionType,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
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
      groups: Array.from(section.groups.values()).map((g) => ({
        ...g,
        questionGroups: Array.from(g.questionGroups.values()),
      })),
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

  importExams = async (payloads: ImportExamBulkBodyReq) => {
    const dataSource = this.db.dataSource;
    const results: Array<Awaited<ReturnType<typeof this.getExamDetail>>> = [];

    const codes = payloads.map((p) => p.code);
    const duplicateCodes = codes.filter(
      (code, idx) => codes.indexOf(code) !== idx
    );
    if (duplicateCodes.length > 0) {
      throw new BadRequestError({ message: "Duplicate exam codes in payload" });
    }

    await dataSource.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const existing = await examRepo.find({ where: { code: In(codes) } });
      if (existing.length > 0) {
        throw new BadRequestError({ message: "Exam code already exists" });
      }

      for (const payload of payloads) {
        const examEntity = examRepo.create({
          examType: payload.examType,
          code: payload.code,
          title: payload.title,
          description: payload.description,
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
        const detail = await this.getExamDetail(saved.id);
        results.push(detail);
      }
    });

    return results;
  };

  // --- Admin Methods ---

  deleteExam = async (examId: number) => {
    const examRepo = await this.db.getRepository(Exam);
    const exam = await examRepo.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundRequestError("Exam not found");
    }
    await examRepo.remove(exam);
    return true;
  };

  updateExam = async (examId: number, body: UpdateExamBodyReq) => {
    const examRepo = await this.db.getRepository(Exam);
    const exam = await examRepo.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundRequestError("Exam not found");
    }

    // Update fields if provided
    if (body.title) exam.title = body.title;
    if (body.description) exam.description = body.description;
    if (body.thumbnailUrl) exam.thumbnailUrl = body.thumbnailUrl;
    if (typeof body.isPublished !== "undefined") exam.isPublished = body.isPublished;
    if (body.code) {
      // Check duplicate code
      const existing = await examRepo.findOne({ where: { code: body.code } });
      if (existing && existing.id !== examId) {
        throw new BadRequestError({ message: "Exam code already exists" });
      }
      exam.code = body.code;
    }
    if (body.examType) exam.examType = body.examType;
    if (body.metadata) {
      exam.metadata = { ...exam.metadata, ...body.metadata };
    }

    return examRepo.save(exam);
  };

  adminListAttempts = async (query: AdminGetExamAttemptsQueryReq) => {
    const attemptRepo = await this.db.getRepository(ExamAttempt);
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Math.min(Number(query.limit), 50) : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const qb = attemptRepo
      .createQueryBuilder("attempt")
      .leftJoinAndSelect("attempt.exam", "exam")
      .leftJoinAndSelect("attempt.user", "user")
      .orderBy("attempt.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (query.userId) {
      qb.andWhere("user.id = :userId", { userId: query.userId });
    }
    if (query.examId) {
      qb.andWhere("exam.id = :examId", { examId: query.examId });
    }
    if (query.status) {
      qb.andWhere("attempt.status = :status", { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        "(LOWER(user.username) ILIKE :search OR LOWER(user.email) ILIKE :search OR LOWER(exam.title) ILIKE :search)",
        { search: `%${query.search.toLowerCase()}%` }
      );
    }
    // Date filtering (createdAt or submittedAt?) - assume createdAt
    if (query.startDate) {
        qb.andWhere("attempt.createdAt >= :startDate", { startDate: query.startDate });
    }
    if (query.endDate) {
        qb.andWhere("attempt.createdAt <= :endDate", { endDate: query.endDate });
    }

    const [attempts, total] = await qb.getManyAndCount();

    // Map to sanitized response
    const items = attempts.map((attempt) => ({
      id: attempt.id,
      user: {
        id: attempt.user.id,
        username: attempt.user.username,
        email: attempt.user.email,
        avatar: attempt.user.avatar
      },
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        code: attempt.exam.code,
      },
      status: attempt.status,
      scoreSummary: attempt.scoreSummary,
      createdAt: attempt.createdAt,
      submittedAt: attempt.submittedAt,
    }));

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      attempts: items,
    };
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
          questionGroups: (group.questionGroups || []).map((qGroup) => ({
            id: qGroup.id,
            title: qGroup.title,
            description: qGroup.description,
            content: qGroup.content,
            resourceUrl: qGroup.resourceUrl,
            metadata: qGroup.metadata,
            questions: (qGroup.questions || []).map((question) => {
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
      // Case 1: Alternative Answers (Question has multiple valid answers, User submits one string)
      // e.g. correctAnswer=["roads", "road system"], submitted="roads" -> TRUE
      if (typeof submitted === "string") {
        return correctAnswer
          .map((item) =>
            typeof item === "string" ? item.trim().toLowerCase() : item
          )
          .includes(submitted.trim().toLowerCase());
      }

      // Case 2: Multiple Select (Question requires multiple answers, User submits array)
      if (!Array.isArray(submitted)) return false;
      if (correctAnswer.length !== submitted.length) return false;
      const normalizedCorrect = correctAnswer.map((item) =>
        typeof item === "string" ? item.trim().toLowerCase() : item
      ).sort();
      const normalizedSubmitted = submitted.map((item) =>
        typeof item === "string" ? item.trim().toLowerCase() : item
      ).sort();
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
        } else if (sectionType === ExamSectionType.WRITING || sectionType === ExamSectionType.SPEAKING) {
          // For Writing/Speaking, use the average of AI-graded scores
          const sectionAnswers = answers.filter(ans => ans.section.id === numericSectionId);
          const scoredAnswers = sectionAnswers.filter(ans => typeof ans.score === 'number');
          
          if (scoredAnswers.length > 0) {
            const avgScore = scoredAnswers.reduce((sum, ans) => sum + (ans.score || 0), 0) / scoredAnswers.length;
            summary.band = Math.round(avgScore * 2) / 2; // Round to nearest 0.5
          }
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
      questionGroups:
        group.questionGroups?.map((qGroup, qgIndex) =>
          this.mapQuestionGroupPayload(qGroup, qgIndex)
        ) || [],
    };
  }

  private mapQuestionGroupPayload(
    group: ImportExamQuestionGroupReq,
    _index: number
  ): DeepPartial<ExamQuestionGroup> {
    return {
      title: group.title,
      description: group.description,
      content: group.content,
      resourceUrl: group.resourceUrl,
      metadata: group.metadata || {},
      questions:
        group.questions?.map((question, qIndex) =>
          this.mapQuestionPayload(question, qIndex)
        ) || [],
    };
  }

  private mapQuestionPayload(
    question: ImportExamQuestionGroupReq["questions"][number],
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

  private async triggerAsyncGrading(
    attempt: ExamAttempt,
    answers: ExamAttemptAnswer[]
  ) {
    const answerRepo = await this.db.getRepository(ExamAttemptAnswer);
    const attemptRepo = await this.db.getRepository(ExamAttempt);

    const gradingPromises = answers.map(async (ans) => {
      // Check if answer needs AI grading
      // Writing
      if (
        ans.question.questionType === ExamQuestionType.ESSAY &&
        ans.answerPayload
      ) {
        const result = await aiService.gradeWriting(
          ans.question.prompt,
          String(ans.answerPayload)
        );
        console.log(result);
        if (result) {
          ans.score = result.score;
          ans.aiFeedback = {
            feedback: result.feedback,
            correctedVersion: result.corrected_version,
          };
          ans.isCorrect = result.score >= 5; // Example threshold
          await answerRepo.save(ans);
        }
      }
      // Speaking
      else if (
        ans.question.questionType === ExamQuestionType.SPEAKING_PROMPT &&
        ans.answerPayload
      ) {
        // answerPayload should be the audio URL
        const result = await aiService.gradeSpeaking(
          ans.question.prompt,
          String(ans.answerPayload)
        );
        console.log(result);
        if (result) {
          ans.score = result.score;
          ans.aiFeedback = {
            feedback: result.feedback,
            correctedVersion: result.corrected_version,
            transcript: result.transcript,
          };
          ans.isCorrect = result.score >= 5;
          await answerRepo.save(ans);
        }
      }
    });

    await Promise.all(gradingPromises);

    // If the attempt was already finalized, we might need to update the summary
    // But since this runs async, checking current status from DB is safer
    const freshAttempt = await attemptRepo.findOne({
      where: { id: attempt.id },
      relations: ["exam"],
    });

    if (
      freshAttempt &&
      freshAttempt.status === ExamAttemptStatus.SUBMITTED
    ) {
      // Re-calculate summary
      const allAnswers = await answerRepo.find({
        where: { attempt: { id: freshAttempt.id } },
        relations: ["question", "section"],
      });
      const newSummary = this.buildScoreSummary(freshAttempt.exam, allAnswers);
      freshAttempt.scoreSummary = newSummary;
      await attemptRepo.save(freshAttempt);
    }
  }
}

export const examService = new ExamService();
