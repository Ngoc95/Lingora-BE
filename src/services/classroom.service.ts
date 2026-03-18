import { DatabaseService } from "./database.service"
import { BadRequestError, ForbiddenRequestError } from "~/core/error.response"
import validator from "validator"
import { Classroom } from "~/entities/classroom.entity"
import { ClassroomMember } from "~/entities/classroomMember.entity"
import { ClassroomLesson } from "~/entities/classroomLesson.entity"
import { ClassroomQuiz } from "~/entities/classroomQuiz.entity"
import { Quiz } from "~/entities/quiz.entity"
import { Flashcard } from "~/entities/flashcard.entity"
import { StudySet } from "~/entities/studySet.entity"
import { ClassroomMemberStatus } from "~/enums/classroomMemberStatus.enum"
import { StudySetVisibility } from "~/enums/studySetVisibility.enum"
import { CreateClassroomBodyReq } from "~/dtos/req/classroom/createClassroomBody.req"
import { UpdateClassroomBodyReq } from "~/dtos/req/classroom/updateClassroomBody.req"
import { GetAllClassroomsQueryReq } from "~/dtos/req/classroom/getAllClassroomsQuery.req"
import { CreateLessonBodyReq } from "~/dtos/req/classroom/createLessonBody.req"
import { UpdateLessonBodyReq } from "~/dtos/req/classroom/updateLessonBody.req"
import { CreateLessonFlashcardBodyReq } from "~/dtos/req/classroom/createLessonFlashcardBody.req"
import { UpdateLessonFlashcardBodyReq } from "~/dtos/req/classroom/updateLessonFlashcardBody.req"
import { CreateClassroomQuizBodyReq } from "~/dtos/req/classroom/createClassroomQuizBody.req"
import { UpdateClassroomQuizBodyReq } from "~/dtos/req/classroom/updateClassroomQuizBody.req"
import { CreateClassroomQuizQuestionBodyReq } from "~/dtos/req/classroom/createClassroomQuizQuestionBody.req"
import { UpdateClassroomQuizQuestionBodyReq } from "~/dtos/req/classroom/updateClassroomQuizQuestionBody.req"
import { Brackets } from "typeorm"

class ClassroomService {
    private db = DatabaseService.getInstance()

    private generateClassroomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // tránh 0/O, 1/I
        const random = Array.from({ length: 6 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('')
        return `CLS-${random}` // VD: CLS-X7K2MQ
    }

    createClassroom = async (teacherId: number, data: CreateClassroomBodyReq) => {
        const classroomRepo = await this.db.getRepository(Classroom)

        // Tự sinh code, retry nếu trùng
        const MAX_ATTEMPTS = 5

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                const classroom = classroomRepo.create({
                    ...data,
                    code: this.generateClassroomCode(),
                    teacher: { id: teacherId } as any,
                })
                await classroomRepo.save(classroom)
                return classroom

            } catch (error) {
                const err = error as { code?: string; message?: string }

                const isUniqueViolation =
                    err.code === '23505' ||
                    err.code === 'ER_DUP_ENTRY' ||
                    err.message?.includes('UNIQUE')

                if (!isUniqueViolation) throw error // lỗi khác → throw ngay

                if (attempt === MAX_ATTEMPTS - 1) {
                    throw new Error(`Failed to generate unique classroom code after ${MAX_ATTEMPTS} attempts`)
                }
                // unique violation + còn attempt → tiếp tục loop
            }
        }
    }

    getAllClassrooms = async ({
        page = 1,
        limit = 20,
        search,
        isPublic,
        sort,
        userId,       // undefined = admin (xem tất cả)
    }: GetAllClassroomsQueryReq & { userId?: number }) => {
        const classroomRepo = await this.db.getRepository(Classroom)
        const skip = (page - 1) * limit

        const qb = classroomRepo
            .createQueryBuilder('classroom')
            .leftJoin('classroom.teacher', 'teacher')
            .addSelect(['teacher.id', 'teacher.username', 'teacher.email', 'teacher.avatar'])
            .leftJoin('classroom.members', 'member')
            .loadRelationCountAndMap('classroom.totalMembers', 'classroom.members')
            .skip(skip)
            .take(limit)

        // === Giới hạn theo membership (nếu không phải admin) ===
        if (userId !== undefined) {
            qb.andWhere(
                new Brackets((qb) => {
                    qb.where('teacher.id = :userId', { userId })                // là GV của lớp
                        .orWhere('member.user_id = :userId', { userId })        // là thành viên
                })
            )
        }

        // === Filter ===
        if (isPublic !== undefined) {
            qb.andWhere('classroom.isPublic = :isPublic', { isPublic })
        }

        // === Search ===
        if (search) {
            const normalized = validator.trim(search).toLowerCase()
            qb.andWhere(
                new Brackets((qb) => {
                    qb.where('LOWER(classroom.name) ILIKE :search', { search: `%${normalized}%` })
                        .orWhere('LOWER(classroom.code) ILIKE :search', { search: `%${normalized}%` })
                        .orWhere('LOWER(classroom.description) ILIKE :search', { search: `%${normalized}%` })
                })
            )
        }

        // === Sort ===
        if (sort && Object.keys(sort).length > 0) {
            for (const [field, direction] of Object.entries(sort)) {
                qb.addOrderBy(`classroom.${field}`, direction as 'ASC' | 'DESC')
            }
        } else {
            qb.orderBy('classroom.id', 'DESC')
        }

        const [classrooms, total] = await qb.getManyAndCount()

        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            classrooms,
        }
    }

    getClassroomById = async (id: number, userId?: number) => {
        const classroomRepo = await this.db.getRepository(Classroom)

        const classroom = await classroomRepo
            .createQueryBuilder('classroom')
            .leftJoin('classroom.teacher', 'teacher')
            .addSelect(['teacher.id', 'teacher.username', 'teacher.email', 'teacher.avatar'])
            .where('classroom.id = :id', { id })
            .getOne()

        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        // Kiểm tra quyền xem: phải là teacher hoặc thành viên (admin không truyền userId)
        if (userId !== undefined) {
            const memberRepo = await this.db.getRepository(ClassroomMember)
            const isMember = await memberRepo.findOne({
                where: [
                    { classroom: { id }, user: { id: userId } },
                ]
            })
            const isTeacher = classroom.teacher?.id === userId
            if (!isMember && !isTeacher) {
                throw new ForbiddenRequestError('You are not a member of this classroom')
            }
        }

        // Count members
        const memberRepo = await this.db.getRepository(ClassroomMember)
        const memberCount = await memberRepo.count({
            where: { classroom: { id } }
        })

        return {
            ...classroom,
            totalMembers: memberCount
        }
    }

    updateClassroomById = async (id: number, data: UpdateClassroomBodyReq) => {
        const classroomRepo = await this.db.getRepository(Classroom)

        const classroom = await classroomRepo.findOne({ where: { id } })
        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        // Kiểm tra maxStudents không được nhỏ hơn số member hiện tại
        if (data.maxStudents !== undefined) {
            const memberRepo = await this.db.getRepository(ClassroomMember)
            const activeCount = await memberRepo.count({
                where: {
                    classroom: { id },
                    status: ClassroomMemberStatus.ACTIVE,
                }
            })
            if (data.maxStudents < activeCount) {
                throw new BadRequestError({
                    message: `maxStudents (${data.maxStudents}) cannot be less than current active member count (${activeCount})`
                })
            }
        }

        Object.assign(classroom, data)
        await classroomRepo.save(classroom)

        return classroom
    }

    deleteClassroomById = async (id: number) => {
        const classroomRepo = await this.db.getRepository(Classroom)

        const classroom = await classroomRepo.findOne({ where: { id } })
        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        await classroomRepo.softRemove(classroom)
        return { success: true }
    }

    // ─────────────────────────────────────────────────
    // LESSON
    // ─────────────────────────────────────────────────

    createLesson = async (classroomId: number, data: CreateLessonBodyReq) => {
        const classroomRepo = await this.db.getRepository(Classroom)
        const classroom = await classroomRepo.findOne({ where: { id: classroomId } })
        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        const lessonRepo = await this.db.getRepository(ClassroomLesson)
        const lesson = lessonRepo.create({ ...data, classroom })
        await lessonRepo.save(lesson)
        return lesson
    }

    getLessons = async (classroomId: number) => {
        const lessonRepo = await this.db.getRepository(ClassroomLesson)
        return lessonRepo.find({
            where: { classroom: { id: classroomId } },
            relations: ['attachments'],
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        })
    }

    getLessonById = async (classroomId: number, lessonId: number) => {
        const lessonRepo = await this.db.getRepository(ClassroomLesson)
        const lesson = await lessonRepo.findOne({
            where: { id: lessonId, classroom: { id: classroomId } },
            relations: ['attachments', 'quizzes', 'flashcards'],
        })
        if (!lesson) throw new BadRequestError({ message: 'Lesson not found' })
        return lesson
    }

    updateLesson = async (classroomId: number, lessonId: number, data: UpdateLessonBodyReq) => {
        const lessonRepo = await this.db.getRepository(ClassroomLesson)
        const lesson = await lessonRepo.findOne({
            where: { id: lessonId, classroom: { id: classroomId } },
        })
        if (!lesson) throw new BadRequestError({ message: 'Lesson not found' })

        Object.assign(lesson, data)
        await lessonRepo.save(lesson)
        return lesson
    }

    deleteLesson = async (classroomId: number, lessonId: number) => {
        const lessonRepo = await this.db.getRepository(ClassroomLesson)
        const lesson = await lessonRepo.findOne({
            where: { id: lessonId, classroom: { id: classroomId } },
        })
        if (!lesson) throw new BadRequestError({ message: 'Lesson not found' })
        await lessonRepo.remove(lesson)
        return { success: true }
    }

    // ─────────────────────────────────────────────────
    // CLASSROOM QUIZ (bài kiểm tra chứa nhiều câu hỏi (quiz))
    // ─────────────────────────────────────────────────
    
    createQuiz = async (classroomId: number, data: CreateClassroomQuizBodyReq) => {
        const classroomRepo = await this.db.getRepository(Classroom)
        const classroom = await classroomRepo.findOne({ where: { id: classroomId } })
        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        const quiz = quizRepo.create({
            ...data,
            classroom,
            ...(data.lessonId ? { lesson: { id: data.lessonId } as any } : {}),
        })
        await quizRepo.save(quiz)
        return quiz
    }

    getQuizzes = async (classroomId: number) => {
        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        return quizRepo.find({
            where: { classroom: { id: classroomId } },
            relations: ['lesson'],
            order: { createdAt: 'ASC' },
        })
    }

    getQuizById = async (classroomId: number, quizId: number) => {
        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        const quiz = await quizRepo.findOne({
            where: { id: quizId, classroom: { id: classroomId } },
            relations: ['lesson', 'questions'],
        })
        if (!quiz) throw new BadRequestError({ message: 'Quiz not found' })
        return quiz
    }

    updateQuiz = async (classroomId: number, quizId: number, data: UpdateClassroomQuizBodyReq) => {
        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        const quiz = await quizRepo.findOne({
            where: { id: quizId, classroom: { id: classroomId } },
        })
        if (!quiz) throw new BadRequestError({ message: 'Quiz not found' })

        const { lessonId, ...rest } = data
        Object.assign(quiz, rest)
        if (lessonId !== undefined) {
            quiz.lesson = lessonId ? { id: lessonId } as any : null
        }
        await quizRepo.save(quiz)
        return quiz
    }

    deleteQuiz = async (classroomId: number, quizId: number) => {
        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        const quiz = await quizRepo.findOne({
            where: { id: quizId, classroom: { id: classroomId } },
        })
        if (!quiz) throw new BadRequestError({ message: 'Quiz not found' })
        await quizRepo.remove(quiz)
        return { success: true }
    }

    // ─── Quiz Questions ───────────────────────────────

    addQuestion = async (quizId: number, data: CreateClassroomQuizQuestionBodyReq) => {
        const questionRepo = await this.db.getRepository(Quiz)
        const question = questionRepo.create({
            ...data,
            classroomQuiz: { id: quizId } as any,
        })
        await questionRepo.save(question)
        return question
    }

    updateQuestion = async (questionId: number, data: UpdateClassroomQuizQuestionBodyReq) => {
        const questionRepo = await this.db.getRepository(Quiz)
        const question = await questionRepo.findOne({ where: { id: questionId } })
        if (!question) throw new BadRequestError({ message: 'Question not found' })
        Object.assign(question, data)
        await questionRepo.save(question)
        return question
    }

    deleteQuestion = async (questionId: number) => {
        const questionRepo = await this.db.getRepository(Quiz)
        const question = await questionRepo.findOne({ where: { id: questionId } })
        if (!question) throw new BadRequestError({ message: 'Question not found' })
        await questionRepo.remove(question)
        return { success: true }
    }

    importQuestionsFromStudySet = async (classroomId: number, quizId: number, studySetId: number, teacherId: number) => {
        // Verify quiz belongs to this classroom
        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        const quiz = await quizRepo.findOne({
            where: { id: quizId, classroom: { id: classroomId } },
        })
        if (!quiz) throw new BadRequestError({ message: 'Quiz not found' })

        // Load study set + chủ sở hữu để kiểm tra quyền
        const studySetRepo = await this.db.getRepository(StudySet)
        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
            relations: ['quizzes', 'owner'],
        })
        if (!studySet) throw new BadRequestError({ message: 'Study set not found' })

        // Visibility check: phải là public hoặc là của chính giáo viên
        const isOwner = studySet.owner?.id === teacherId
        const isPublic = studySet.visibility === StudySetVisibility.PUBLIC
        if (!isOwner && !isPublic) {
            throw new ForbiddenRequestError('Study set is private and does not belong to you')
        }

        if (!studySet.quizzes?.length) throw new BadRequestError({ message: 'Study set has no questions' })

        // Copy từng câu hỏi — độc lập với study set gốc
        const questionRepo = await this.db.getRepository(Quiz)
        const copied = studySet.quizzes.map((q) =>
            questionRepo.create({
                type: q.type,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                sourceQuizId: q.id,
                classroomQuiz: { id: quizId } as any,
            })
        )
        await questionRepo.save(copied)

        // Lưu sourceStudySetId để tham chiếu
        quiz.sourceStudySetId = studySetId
        await quizRepo.save(quiz)

        return { imported: copied.length }
    }

    importFlashcardsFromStudySet = async (classroomId: number, lessonId: number, studySetId: number, teacherId: number) => {
        // Verify lesson belongs to this classroom
        const lessonRepo = await this.db.getRepository(ClassroomLesson)
        const lesson = await lessonRepo.findOne({
            where: { id: lessonId, classroom: { id: classroomId } },
        })
        if (!lesson) throw new BadRequestError({ message: 'Lesson not found' })

        // Load study set + chủ sở hữu để kiểm tra quyền
        const studySetRepo = await this.db.getRepository(StudySet)
        const studySet = await studySetRepo.findOne({
            where: { id: studySetId },
            relations: ['flashcards', 'owner'],
        })
        if (!studySet) throw new BadRequestError({ message: 'Study set not found' })

        // Visibility check: phải là public hoặc là của chính giáo viên
        const isOwner = studySet.owner?.id === teacherId
        const isPublic = studySet.visibility === StudySetVisibility.PUBLIC
        if (!isOwner && !isPublic) {
            throw new ForbiddenRequestError('Study set is private and does not belong to you')
        }

        if (!studySet.flashcards?.length) throw new BadRequestError({ message: 'Study set has no flashcards' })

        // Copy từng flashcard vào lesson — độc lập với study set gốc
        const flashcardRepo = await this.db.getRepository(Flashcard)
        const copied = studySet.flashcards.map((f) =>
            flashcardRepo.create({
                frontText: f.frontText,
                backText: f.backText,
                example: f.example,
                audioUrl: f.audioUrl,
                imageUrl: f.imageUrl,
                sourceFlashcardId: f.id,
                classroomLesson: { id: lessonId } as any,
            })
        )
        await flashcardRepo.save(copied)

        // Lưu sourceStudySetId trên lesson để tham chiếu
        lesson.sourceStudySetId = studySetId
        await lessonRepo.save(lesson)

        return { imported: copied.length }
    }

    // ─── Lesson Flashcards (manual CRUD) ─────────────

    addFlashcard = async (lessonId: number, data: CreateLessonFlashcardBodyReq) => {
        const flashcardRepo = await this.db.getRepository(Flashcard)
        const flashcard = flashcardRepo.create({
            ...data,
            classroomLesson: { id: lessonId } as any,
        })
        await flashcardRepo.save(flashcard)
        return flashcard
    }

    updateFlashcard = async (flashcardId: number, data: UpdateLessonFlashcardBodyReq) => {
        const flashcardRepo = await this.db.getRepository(Flashcard)
        const flashcard = await flashcardRepo.findOne({ where: { id: flashcardId } })
        if (!flashcard) throw new BadRequestError({ message: 'Flashcard not found' })
        Object.assign(flashcard, data)
        await flashcardRepo.save(flashcard)
        return flashcard
    }

    deleteFlashcard = async (flashcardId: number) => {
        const flashcardRepo = await this.db.getRepository(Flashcard)
        const flashcard = await flashcardRepo.findOne({ where: { id: flashcardId } })
        if (!flashcard) throw new BadRequestError({ message: 'Flashcard not found' })
        await flashcardRepo.remove(flashcard)
        return { success: true }
    }
}

export const classroomService = new ClassroomService()

