import { Request, Response } from 'express'
import { CREATED, SuccessResponse } from '~/core/success.response'
import { ForbiddenRequestError } from '~/core/error.response'
import { RoleName } from '~/enums/role.enum'
import { classroomService } from '~/services/classroom.service'
import { classroomChatService } from '~/services/classroomChat.service'

class ClassroomController {
    create = async (req: Request, res: Response) => {
        const teacherId = req.user!.id
        return new CREATED({
            message: 'Create new classroom successfully',
            metaData: await classroomService.createClassroom(teacherId, req.body)
        }).send(res);
    }

    getAll = async (req: Request, res: Response) => {
        const isAdmin = req.user!.roles?.some((r: any) => r.name === RoleName.ADMIN)
        const userId = isAdmin ? undefined : req.user!.id
        return new SuccessResponse({
            message: 'Get all classrooms successfully',
            metaData: await classroomService.getAllClassrooms({
                ...req.query,
                ...req.parseQueryPagination,
                ...req.parseQueryBoolean,
                sort: req.sortParsed,
                userId
            })
        }).send(res)
    }

    getById = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        const isAdmin = req.user!.roles?.some((r: any) => r.name === RoleName.ADMIN)
        const userId = isAdmin ? undefined : req.user!.id
        return new SuccessResponse({
            message: 'Get classroom successfully',
            metaData: await classroomService.getClassroomById(id, userId)
        }).send(res)
    }

    update = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Update classroom successfully',
            metaData: await classroomService.updateClassroomById(id, req.body)
        }).send(res)
    }

    delete = async (req: Request, res: Response) => {
        const id = parseInt(req.params?.id)
        return new SuccessResponse({
            message: 'Delete classroom successfully',
            metaData: await classroomService.deleteClassroomById(id)
        }).send(res)
    }

    // ─────────────────────────────────────────────────
    // LESSON
    // ─────────────────────────────────────────────────

    createLesson = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        return new CREATED({
            message: 'Create lesson successfully',
            metaData: await classroomService.createLesson(classroomId, req.body)
        }).send(res)
    }

    getLessons = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        return new SuccessResponse({
            message: 'Get lessons successfully',
            metaData: await classroomService.getLessons(classroomId)
        }).send(res)
    }

    getLessonById = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const lessonId = parseInt(req.params.lessonId)
        return new SuccessResponse({
            message: 'Get lesson successfully',
            metaData: await classroomService.getLessonById(classroomId, lessonId)
        }).send(res)
    }

    updateLesson = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const lessonId = parseInt(req.params.lessonId)
        return new SuccessResponse({
            message: 'Update lesson successfully',
            metaData: await classroomService.updateLesson(classroomId, lessonId, req.body)
        }).send(res)
    }

    deleteLesson = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const lessonId = parseInt(req.params.lessonId)
        return new SuccessResponse({
            message: 'Delete lesson successfully',
            metaData: await classroomService.deleteLesson(classroomId, lessonId)
        }).send(res)
    }

    addFlashcard = async (req: Request, res: Response) => {
        const lessonId = parseInt(req.params.lessonId)
        return new CREATED({
            message: 'Add flashcard successfully',
            metaData: await classroomService.addFlashcard(lessonId, req.body)
        }).send(res)
    }

    updateFlashcard = async (req: Request, res: Response) => {
        const flashcardId = parseInt(req.params.flashcardId)
        return new SuccessResponse({
            message: 'Update flashcard successfully',
            metaData: await classroomService.updateFlashcard(flashcardId, req.body)
        }).send(res)
    }

    deleteFlashcard = async (req: Request, res: Response) => {
        const flashcardId = parseInt(req.params.flashcardId)
        return new SuccessResponse({
            message: 'Delete flashcard successfully',
            metaData: await classroomService.deleteFlashcard(flashcardId)
        }).send(res)
    }

    // ─────────────────────────────────────────────────
    // CLASSROOM QUIZ
    // ─────────────────────────────────────────────────


    createQuiz = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        return new CREATED({
            message: 'Create quiz successfully',
            metaData: await classroomService.createQuiz(classroomId, req.body)
        }).send(res)
    }

    getQuizzes = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        return new SuccessResponse({
            message: 'Get quizzes successfully',
            metaData: await classroomService.getQuizzes(classroomId)
        }).send(res)
    }

    getQuizById = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const quizId = parseInt(req.params.quizId)
        return new SuccessResponse({
            message: 'Get quiz successfully',
            metaData: await classroomService.getQuizById(classroomId, quizId)
        }).send(res)
    }

    updateQuiz = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const quizId = parseInt(req.params.quizId)
        return new SuccessResponse({
            message: 'Update quiz successfully',
            metaData: await classroomService.updateQuiz(classroomId, quizId, req.body)
        }).send(res)
    }

    deleteQuiz = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const quizId = parseInt(req.params.quizId)
        return new SuccessResponse({
            message: 'Delete quiz successfully',
            metaData: await classroomService.deleteQuiz(classroomId, quizId)
        }).send(res)
    }

    addQuestion = async (req: Request, res: Response) => {
        const quizId = parseInt(req.params.quizId)
        return new CREATED({
            message: 'Add question successfully',
            metaData: await classroomService.addQuestion(quizId, req.body)
        }).send(res)
    }

    updateQuestion = async (req: Request, res: Response) => {
        const questionId = parseInt(req.params.questionId)
        return new SuccessResponse({
            message: 'Update question successfully',
            metaData: await classroomService.updateQuestion(questionId, req.body)
        }).send(res)
    }

    deleteQuestion = async (req: Request, res: Response) => {
        const questionId = parseInt(req.params.questionId)
        return new SuccessResponse({
            message: 'Delete question successfully',
            metaData: await classroomService.deleteQuestion(questionId)
        }).send(res)
    }

    importQuestionsFromStudySet = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const quizId = parseInt(req.params.quizId)
        const teacherId = req.user!.id
        const { studySetId } = req.body
        return new SuccessResponse({
            message: 'Import questions successfully',
            metaData: await classroomService.importQuestionsFromStudySet(classroomId, quizId, studySetId, teacherId)
        }).send(res)
    }

    importFlashcardsFromStudySet = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const lessonId = parseInt(req.params.lessonId)
        const teacherId = req.user!.id
        const { studySetId } = req.body
        return new SuccessResponse({
            message: 'Import flashcards successfully',
            metaData: await classroomService.importFlashcardsFromStudySet(classroomId, lessonId, studySetId, teacherId)
        }).send(res)
    }

    // ─────────────────────────────────────────────────
    // CHAT
    // ─────────────────────────────────────────────────

    getChatHistory = async (req: Request, res: Response) => {
        const classroomId = parseInt(req.params.id)
        const limit = parseInt(req.query.limit as string) || 50
        const beforeId = req.query.beforeId ? parseInt(req.query.beforeId as string) : undefined
        return new SuccessResponse({
            message: 'Get chat history successfully',
            metaData: await classroomChatService.getChatHistory(classroomId, limit, beforeId)
        }).send(res)
    }

    // ─────────────────────────────────────────────────
    // LESSON ATTACHMENTS
    // ─────────────────────────────────────────────────

    addAttachment = async (req: Request, res: Response) => {
        const lessonId = parseInt(req.params.lessonId)
        return new CREATED({
            message: 'Add attachment successfully',
            metaData: await classroomService.addAttachment(lessonId, req.body)
        }).send(res)
    }

    getAttachments = async (req: Request, res: Response) => {
        const lessonId = parseInt(req.params.lessonId)
        return new SuccessResponse({
            message: 'Get attachments successfully',
            metaData: await classroomService.getAttachments(lessonId)
        }).send(res)
    }

    updateAttachment = async (req: Request, res: Response) => {
        const attachmentId = parseInt(req.params.attachmentId)
        return new SuccessResponse({
            message: 'Update attachment successfully',
            metaData: await classroomService.updateAttachment(attachmentId, req.body)
        }).send(res)
    }

    deleteAttachment = async (req: Request, res: Response) => {
        const attachmentId = parseInt(req.params.attachmentId)
        return new SuccessResponse({
            message: 'Delete attachment successfully',
            metaData: await classroomService.deleteAttachment(attachmentId)
        }).send(res)
    }
}

export const classroomController = new ClassroomController()
