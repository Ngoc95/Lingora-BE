import { DatabaseService } from "./database.service"
import { BadRequestError, ForbiddenRequestError } from "~/core/error.response"
import validator from "validator"
import { Classroom } from "~/entities/classroom.entity"
import { ClassroomMember } from "~/entities/classroomMember.entity"
import { ClassroomLesson } from "~/entities/classroomLesson.entity"
import { ClassroomQuiz } from "~/entities/classroomQuiz.entity"
import { ClassroomQuizAttempt } from "~/entities/classroomQuizAttempt.entity"
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
import eventBus from "~/events-handler/eventBus"
import { EVENTS } from "~/events-handler/constants"
import { UpdateLessonFlashcardBodyReq } from "~/dtos/req/classroom/updateLessonFlashcardBody.req"
import { CreateClassroomQuizBodyReq } from "~/dtos/req/classroom/createClassroomQuizBody.req"
import { UpdateClassroomQuizBodyReq } from "~/dtos/req/classroom/updateClassroomQuizBody.req"
import { CreateClassroomQuizQuestionBodyReq } from "~/dtos/req/classroom/createClassroomQuizQuestionBody.req"
import { UpdateClassroomQuizQuestionBodyReq } from "~/dtos/req/classroom/updateClassroomQuizQuestionBody.req"
import { Brackets, In } from "typeorm"
import { rankingService } from "./ranking.service"

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
        status,
        isPublic,
        teacherId,
        membership,
        sort,
        userId,       // undefined = admin (xem tất cả)
    }: GetAllClassroomsQueryReq & { userId?: number }) => {
        const classroomRepo = await this.db.getRepository(Classroom)
        const skip = (page - 1) * limit

        const qb = classroomRepo
            .createQueryBuilder('classroom')
            .leftJoin('classroom.teacher', 'teacher')
            .addSelect(['teacher.id', 'teacher.username', 'teacher.email', 'teacher.avatar'])
            .leftJoin('classroom.members', 'member', 'member.status = :activeStatus', { activeStatus: ClassroomMemberStatus.ACTIVE })
            .loadRelationCountAndMap('classroom.totalMembers', 'classroom.members', 'cm', (qb) =>
                qb.where('cm.status = :cntStatus', { cntStatus: ClassroomMemberStatus.ACTIVE })
            )
            .skip(skip)
            .take(limit)

        // === Giới hạn theo membership (nếu không phải admin và có chỉ định membership) ===
        if (userId !== undefined && membership) {
            if (membership === 'TEACHER') {
                qb.andWhere('teacher.id = :userId', { userId })
            } else if (membership === 'STUDENT') {
                qb.andWhere('member.user = :userId', { userId })
                qb.andWhere('member.status = :memberActiveStatus', { memberActiveStatus: ClassroomMemberStatus.ACTIVE })
                qb.andWhere('teacher.id != :userId', { userId })
            } else {
                // ALL (Default logic: either teacher or active member)
                qb.andWhere(
                    new Brackets((qb) => {
                        qb.where('teacher.id = :userId', { userId })
                            .orWhere('member.user = :userId AND member.status = :memberActiveStatus', { userId, memberActiveStatus: ClassroomMemberStatus.ACTIVE })
                    })
                )
            }
        }

        // === Filter ===
        if (isPublic !== undefined) {
            qb.andWhere('classroom.isPublic = :isPublic', { isPublic })
        }

        if (status) {
            qb.andWhere('classroom.status = :status', { status })
        }

        if (teacherId) {
            qb.andWhere('teacher.id = :teacherId', { teacherId })
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

        // Map myStatus (only if userId is provided)
        if (userId !== undefined) {
            const memberRepo = await this.db.getRepository(ClassroomMember)
            const classroomIds = classrooms.map(c => c.id)
            
            if (classroomIds.length > 0) {
                const myMemberships = await memberRepo.find({
                    where: {
                        classroom: { id: In(classroomIds) },
                        user: { id: userId }
                    },
                    relations: ['classroom']
                })
                
                const membershipMap = new Map(myMemberships.map(m => [m.classroom.id, m.status]))
                classrooms.forEach((c) => {
                    const classroom = c as Classroom & { myStatus?: string | null }
                    const isTeacher = classroom.teacher?.id === userId
                    if (isTeacher) {
                        classroom.myStatus = 'ACTIVE'
                    } else {
                        classroom.myStatus = membershipMap.get(classroom.id) || null
                    }
                })
            }
        }

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

        // Kiểm tra quyền xem: phải là teacher hoặc thành viên ACTIVE (admin không truyền userId)
        if (userId !== undefined) {
            const memberRepo = await this.db.getRepository(ClassroomMember)
            const isMember = await memberRepo.findOne({
                where: { classroom: { id }, user: { id: userId }, status: ClassroomMemberStatus.ACTIVE }
            })
            const isTeacher = classroom.teacher?.id === userId
            if (!isMember && !isTeacher) {
                throw new ForbiddenRequestError('You are not a member of this classroom')
            }
        }

        // Count active members only
        const memberRepo = await this.db.getRepository(ClassroomMember)
        const memberCount = await memberRepo.count({
            where: { classroom: { id }, status: ClassroomMemberStatus.ACTIVE }
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
    // MEMBER MANAGEMENT
    // ─────────────────────────────────────────────────

    joinByCode = async (userId: number, code: string) => {
        const classroomRepo = await this.db.getRepository(Classroom)
        const memberRepo = await this.db.getRepository(ClassroomMember)

        const classroom = await classroomRepo.findOne({ where: { code }, relations: ['teacher'] })
        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        if (classroom.teacher?.id === userId) {
            throw new BadRequestError({ message: 'You are the teacher of this classroom' })
        }

        const existingMember = await memberRepo.findOne({
            where: { classroom: { id: classroom.id }, user: { id: userId } }
        })

        if (existingMember) {
            if (existingMember.status === ClassroomMemberStatus.ACTIVE) {
                throw new BadRequestError({ message: 'You are already an active member' })
            }
            if (existingMember.status === ClassroomMemberStatus.PENDING) {
                throw new BadRequestError({ message: 'Your join request is pending' })
            }
            existingMember.status = classroom.isPublic ? ClassroomMemberStatus.ACTIVE : ClassroomMemberStatus.PENDING
            await memberRepo.save(existingMember)
            if (existingMember.status === ClassroomMemberStatus.ACTIVE) {
                await rankingService.ensureClassroomStatsRow(userId, classroom.id)
            }
            return classroom
        }

        const newMember = memberRepo.create({
            classroom: { id: classroom.id } as any,
            user: { id: userId } as any,
            status: classroom.isPublic ? ClassroomMemberStatus.ACTIVE : ClassroomMemberStatus.PENDING
        })
        await memberRepo.save(newMember)
        if (newMember.status === ClassroomMemberStatus.ACTIVE) {
            await rankingService.ensureClassroomStatsRow(userId, classroom.id)
        }
        return classroom
    }

    getMembers = async (classroomId: number, status?: string) => {
        const memberRepo = await this.db.getRepository(ClassroomMember)
        const qb = memberRepo.createQueryBuilder('member')
            .leftJoinAndSelect('member.user', 'user')
            .where('member.classroom.id = :classroomId', { classroomId })

        if (status) {
            qb.andWhere('member.status = :status', { status })
        } else {
            qb.andWhere('member.status IN (:...statuses)', { statuses: [ClassroomMemberStatus.ACTIVE, ClassroomMemberStatus.PENDING] })
        }
        
        qb.orderBy('member.joinedAt', 'DESC')
        return qb.getMany()
    }

    approveMember = async (classroomId: number, memberId: number, teacherId: number) => {
        const classroomRepo = await this.db.getRepository(Classroom)
        const memberRepo = await this.db.getRepository(ClassroomMember)

        const classroom = await classroomRepo.findOne({ where: { id: classroomId }, relations: ['teacher'] })
        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        if (classroom.teacher?.id !== teacherId) {
            // allow bypass for admin or handle via roles? For now just teacher check
            throw new ForbiddenRequestError('Only the teacher can approve members')
        }

        const member = await memberRepo.findOne({ 
            where: { id: memberId, classroom: { id: classroomId } },
            relations: ['user'] 
        })
        if (!member) throw new BadRequestError({ message: 'Member not found' })
        if (member.status !== ClassroomMemberStatus.PENDING) {
            throw new BadRequestError({ message: 'Member is not pending approval' })
        }

        member.status = ClassroomMemberStatus.ACTIVE
        await memberRepo.save(member)

        await rankingService.ensureClassroomStatsRow(member.user.id, classroom.id)

        eventBus.emit(EVENTS.CLASSROOM_APPROVED, { 
            classroom, 
            member 
        })

        return member
    }

    kickMember = async (classroomId: number, memberId: number, teacherId: number) => {
        const classroomRepo = await this.db.getRepository(Classroom)
        const memberRepo = await this.db.getRepository(ClassroomMember)

        const classroom = await classroomRepo.findOne({ where: { id: classroomId }, relations: ['teacher'] })
        if (!classroom) throw new BadRequestError({ message: 'Classroom not found' })

        if (classroom.teacher?.id !== teacherId) {
            throw new ForbiddenRequestError('Only the teacher can remove members')
        }

        const member = await memberRepo.findOne({ 
            where: { id: memberId, classroom: { id: classroomId } },
            relations: ['user']
        })
        if (!member) throw new BadRequestError({ message: 'Member not found' })

        if (member.user.id === classroom.teacher.id) {
            throw new BadRequestError({ message: 'Cannot remove the teacher from the classroom' })
        }

        member.status = ClassroomMemberStatus.REMOVED
        await memberRepo.save(member)
        return { success: true }
    }

    submitQuizAttempt = async (userId: number, classroomId: number, quizId: number, answers: Record<string, string>) => {
        const result = await this.db.dataSource.transaction(async (transactionalEntityManager) => {
            const quizRepo = transactionalEntityManager.getRepository(ClassroomQuiz)
            const attemptRepo = transactionalEntityManager.getRepository(ClassroomQuizAttempt)

            // Lock the quiz row to prevent concurrent attempt count races if necessary, 
            // but usually a transaction with SERIALIZABLE or a lock on the attempt count is enough.
            // For simplicity and effectiveness, we count within the transaction.
            const quiz = await quizRepo.findOne({
                where: { id: quizId, classroom: { id: classroomId } },
                relations: ['questions']
            })
            if (!quiz) throw new BadRequestError({ message: 'Quiz not found' })

            const previousAttempts = await attemptRepo.count({
                where: { user: { id: userId }, quiz: { id: quizId } }
            })
            
            if (previousAttempts >= quiz.maxAttempts) {
                throw new BadRequestError({ message: 'Maximum attempts reached for this quiz' })
            }

            let correctCount = 0
            const total = quiz.questions?.length || 0

            quiz.questions?.forEach((q: any) => {
                const userChoice = answers[q.id.toString()]
                if (userChoice && userChoice.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
                    correctCount++
                }
            })

            const score = total > 0 ? parseFloat((correctCount / total).toFixed(2)) : 0

            const attempt = attemptRepo.create({
                quiz: { id: quizId } as any,
                user: { id: userId } as any,
                attemptNumber: previousAttempts + 1,
                score,
                answers,
                startedAt: new Date(),
                submittedAt: new Date()
            })
            await attemptRepo.save(attempt)

            return { 
                attempt: {
                    ...attempt,
                    correctCount
                }, 
                isPassing: score >= quiz.passingScore 
            }
        })

        // Fire ranking event after the transaction commits so XP is only
        // awarded for successfully persisted attempts.
        eventBus.emit(EVENTS.CLASSROOM_QUIZ_SUBMITTED, {
            userId,
            classroomId,
            referencedId: result.attempt.id,
            score: result.attempt.score,
            isPass: result.isPassing
        })

        return result
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

    getLessons = async (classroomId: number, userId?: number) => {
        const lessonRepo = await this.db.getRepository(ClassroomLesson)
        
        const qb = lessonRepo.createQueryBuilder('lesson')
            .leftJoin('lesson.classroom', 'classroom')
            .leftJoin('classroom.teacher', 'teacher')
            .leftJoinAndSelect('lesson.attachments', 'attachment')
            .where('classroom.id = :classroomId', { classroomId })

        if (userId !== undefined) {
            qb.andWhere(new Brackets(qb => {
                qb.where('lesson.isPublished = true')
                  .orWhere('teacher.id = :userId', { userId })
            }))
        } else {
            qb.andWhere('lesson.isPublished = true')
        }
        
        qb.orderBy('lesson.sortOrder', 'ASC')
          .addOrderBy('lesson.createdAt', 'ASC')

        return qb.getMany()
    }

    getLessonById = async (classroomId: number, lessonId: number, userId?: number) => {
        const lessonRepo = await this.db.getRepository(ClassroomLesson)
        
        const qb = lessonRepo.createQueryBuilder('lesson')
            .leftJoin('lesson.classroom', 'classroom')
            .leftJoin('classroom.teacher', 'teacher')
            .leftJoinAndSelect('lesson.attachments', 'attachment')
            .leftJoinAndSelect('lesson.quizzes', 'quiz')
            .leftJoinAndSelect('lesson.flashcards', 'flashcard')
            .where('lesson.id = :lessonId', { lessonId })
            .andWhere('classroom.id = :classroomId', { classroomId })

        if (userId !== undefined) {
            qb.andWhere(new Brackets(qb => {
                qb.where('lesson.isPublished = true')
                  .orWhere('teacher.id = :userId', { userId })
            }))
        } else {
            qb.andWhere('lesson.isPublished = true')
        }

        const lesson = await qb.getOne()
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

        // Validate passingScore between 0 and 1
        if (data.passingScore !== undefined) {
            if (data.passingScore < 0 || data.passingScore > 1) {
                throw new BadRequestError({ message: 'Passing score must be between 0 and 1' })
            }
        }

        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        const quiz = quizRepo.create({
            ...data,
            classroom,
            ...(data.lessonId ? { lesson: { id: data.lessonId } as any } : {}),
        })
        await quizRepo.save(quiz)
        return quiz
    }

    getQuizzes = async (classroomId: number, userId?: number) => {
        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        
        const qb = quizRepo.createQueryBuilder('quiz')
            .leftJoin('quiz.classroom', 'classroom')
            .leftJoin('classroom.teacher', 'teacher')
            .leftJoinAndSelect('quiz.lesson', 'lesson')
            .where('classroom.id = :classroomId', { classroomId })

        if (userId !== undefined) {
            qb.andWhere(new Brackets(qb => {
                qb.where('quiz.isPublished = true')
                  .orWhere('teacher.id = :userId', { userId })
            }))
        } else {
            qb.andWhere('quiz.isPublished = true')
        }

        return qb.orderBy('quiz.createdAt', 'ASC').getMany()
    }

    getQuizById = async (classroomId: number, quizId: number, userId?: number) => {
        const quizRepo = await this.db.getRepository(ClassroomQuiz)

        const qb = quizRepo.createQueryBuilder('quiz')
            .leftJoin('quiz.classroom', 'classroom')
            .leftJoin('classroom.teacher', 'teacher')
            .addSelect(['teacher.id'])
            .leftJoinAndSelect('quiz.lesson', 'lesson')
            .leftJoinAndSelect('quiz.questions', 'question')
            .where('quiz.id = :quizId', { quizId })
            .andWhere('classroom.id = :classroomId', { classroomId })

        if (userId !== undefined) {
            qb.andWhere(new Brackets(qb => {
                qb.where('quiz.isPublished = true')
                  .orWhere('teacher.id = :userId', { userId })
            }))
        } else {
            qb.andWhere('quiz.isPublished = true')
        }

        const result = await qb.getOne()
        if (!result) throw new BadRequestError({ message: 'Quiz not found' })
        
        const isUserTeacher = userId !== undefined && (result as any).classroom?.teacher?.id === userId

        if (userId !== undefined && !isUserTeacher) {
            const attemptRepo = await this.db.getRepository(ClassroomQuizAttempt)
            const userAttempts = await attemptRepo.count({
                where: { user: { id: userId }, quiz: { id: quizId } }
            });
            (result as any).userAttempts = userAttempts
        }

        return result
    }

    getQuizAttempts = async (classroomId: number, quizId: number) => {
        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        const quiz = await quizRepo.findOne({
            where: { id: quizId, classroom: { id: classroomId } },
        })
        if (!quiz) throw new BadRequestError({ message: 'Quiz not found' })

        const attemptRepo = await this.db.getRepository(ClassroomQuizAttempt)
        const attempts = await attemptRepo.createQueryBuilder('attempt')
            .leftJoin('attempt.user', 'user')
            .addSelect(['user.id', 'user.username', 'user.avatar'])
            .leftJoin('attempt.quiz', 'quiz')
            .where('quiz.id = :quizId', { quizId })
            .orderBy('attempt.submittedAt', 'DESC')
            .getMany()

        return attempts
    }

    updateQuiz = async (classroomId: number, quizId: number, data: UpdateClassroomQuizBodyReq) => {
        const quizRepo = await this.db.getRepository(ClassroomQuiz)
        const quiz = await quizRepo.findOne({
            where: { id: quizId, classroom: { id: classroomId } },
        })
        if (!quiz) throw new BadRequestError({ message: 'Quiz not found' })

        // Validate passingScore between 0 and 1
        if (data.passingScore !== undefined) {
             if (data.passingScore < 0 || data.passingScore > 1) {
                throw new BadRequestError({ message: 'Passing score must be between 0 and 1' })
            }
        }

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

        return this.getQuizById(classroomId, quizId, teacherId)
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

        return this.getLessonById(classroomId, lessonId, teacherId)
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

