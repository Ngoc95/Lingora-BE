import { Router } from "express";
import { classroomController } from "~/controllers/classroom.controller";
import { Classroom } from "~/entities/classroom.entity";
import { Resource } from "~/enums/resource.enum";
import { accessTokenValidation, checkPermission } from "~/middlewares/auth.middlewares";
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from "~/middlewares/common.middlewares";
import { createClassroomValidation } from "~/middlewares/classroom/createClassroom.middlewares";
import { updateClassroomValidation } from "~/middlewares/classroom/updateClassroom.middlewares";
import { isClassroomTeacher } from "~/middlewares/classroom/isClassroomTeacher.middlewares";
import { isClassroomMember } from "~/middlewares/classroom/isClassroomMember.middlewares";
import { createLessonValidation, updateLessonValidation } from "~/middlewares/classroom/lesson.middlewares";
import { createFlashcardValidation, updateFlashcardValidation } from "~/middlewares/classroom/flashcard.middlewares";
import {
    createClassroomQuizValidation,
    updateClassroomQuizValidation,
    createQuestionValidation,
    updateQuestionValidation
} from "~/middlewares/classroom/classroomQuiz.middlewares";
import { joinClassroomValidation } from "~/middlewares/classroom/joinClassroom.middlewares";
import { submitQuizAttemptValidation } from "~/middlewares/classroom/submitQuizAttempt.middlewares";
import { wrapRequestHandler } from "~/utils/handler";

const classroomRouter = Router();

// access token validation
classroomRouter.use(accessTokenValidation)

// ══════════════════════════════════════════════════
// CLASSROOM
// ══════════════════════════════════════════════════

classroomRouter.post(
    '',
    wrapRequestHandler(checkPermission('createOwn', Resource.CLASSROOM)),
    createClassroomValidation,
    wrapRequestHandler(classroomController.create)
)

classroomRouter.get(
    '',
    checkQueryMiddleware({ booleanFields: ['isPublic'] }),
    wrapRequestHandler(parseSort({ allowSortList: Classroom.allowSortList })),
    wrapRequestHandler(classroomController.getAll)
)

classroomRouter.get(
    '/:id',
    checkIdParamMiddleware,
    isClassroomMember,
    wrapRequestHandler(classroomController.getById)
)

classroomRouter.patch(
    '/:id',
    checkIdParamMiddleware,
    isClassroomTeacher,
    updateClassroomValidation,
    wrapRequestHandler(classroomController.update)
)

classroomRouter.delete(
    '/:id',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.delete)
)

// ══════════════════════════════════════════════════
// MEMBER MANAGEMENT
// ══════════════════════════════════════════════════

classroomRouter.post(
    '/join',
    joinClassroomValidation,
    wrapRequestHandler(classroomController.joinByCode)
)

classroomRouter.get(
    '/:id/members',
    checkIdParamMiddleware,
    isClassroomMember,
    wrapRequestHandler(classroomController.getMembers)
)

classroomRouter.patch(
    '/:id/members/:memberId/approve',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.approveMember)
)

classroomRouter.delete(
    '/:id/members/:memberId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.kickMember)
)

// ══════════════════════════════════════════════════
// LESSONS  /classrooms/:id/lessons
// ══════════════════════════════════════════════════

classroomRouter.post(
    '/:id/lessons',
    checkIdParamMiddleware,
    isClassroomTeacher,
    createLessonValidation,
    wrapRequestHandler(classroomController.createLesson)
)

classroomRouter.get(
    '/:id/lessons',
    checkIdParamMiddleware,
    isClassroomMember,
    wrapRequestHandler(classroomController.getLessons)
)

classroomRouter.get(
    '/:id/lessons/:lessonId',
    checkIdParamMiddleware,
    isClassroomMember,
    wrapRequestHandler(classroomController.getLessonById)
)

classroomRouter.patch(
    '/:id/lessons/:lessonId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    updateLessonValidation,
    wrapRequestHandler(classroomController.updateLesson)
)

classroomRouter.delete(
    '/:id/lessons/:lessonId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.deleteLesson)
)

// Import flashcards từ study set vào lesson
classroomRouter.post(
    '/:id/lessons/:lessonId/import-studyset',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.importFlashcardsFromStudySet)
)

// ── Lesson Flashcards (manual CRUD) ──────────────

classroomRouter.post(
    '/:id/lessons/:lessonId/flashcards',
    checkIdParamMiddleware,
    isClassroomTeacher,
    createFlashcardValidation,
    wrapRequestHandler(classroomController.addFlashcard)
)

classroomRouter.patch(
    '/:id/lessons/:lessonId/flashcards/:flashcardId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    updateFlashcardValidation,
    wrapRequestHandler(classroomController.updateFlashcard)
)

classroomRouter.delete(
    '/:id/lessons/:lessonId/flashcards/:flashcardId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.deleteFlashcard)
)

// ══════════════════════════════════════════════════
// CLASSROOM QUIZZES  /classrooms/:id/quizzes
// ══════════════════════════════════════════════════
// LƯU Ý với các tên route: tên quiz -> classroomQuiz entity, tên question -> quiz entity

// tạo classroomQuiz (1 bộ kiểm tra)
classroomRouter.post(
    '/:id/quizzes',
    checkIdParamMiddleware,
    isClassroomTeacher,
    createClassroomQuizValidation,
    wrapRequestHandler(classroomController.createQuiz)
)

classroomRouter.get(
    '/:id/quizzes',
    checkIdParamMiddleware,
    isClassroomMember,
    wrapRequestHandler(classroomController.getQuizzes)
)

classroomRouter.get(
    '/:id/quizzes/:quizId',
    checkIdParamMiddleware,
    isClassroomMember,
    wrapRequestHandler(classroomController.getQuizById)
)

classroomRouter.post(
    '/:id/quizzes/:quizId/attempt',
    checkIdParamMiddleware,
    isClassroomMember,
    submitQuizAttemptValidation,
    wrapRequestHandler(classroomController.submitQuizAttempt)
)

classroomRouter.patch(
    '/:id/quizzes/:quizId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    updateClassroomQuizValidation,
    wrapRequestHandler(classroomController.updateQuiz)
)

classroomRouter.delete(
    '/:id/quizzes/:quizId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.deleteQuiz)
)

// Import questions từ study set vào ClassroomQuiz
classroomRouter.post(
    '/:id/quizzes/:quizId/import-studyset',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.importQuestionsFromStudySet)
)

// ── Quiz Questions (manual CRUD) ────────────────────────────────

// thêm 1 quiz vào classroomQuiz 
classroomRouter.post(
    '/:id/quizzes/:quizId/questions',
    checkIdParamMiddleware,
    isClassroomTeacher,
    createQuestionValidation,
    wrapRequestHandler(classroomController.addQuestion)
)

classroomRouter.patch(
    '/:id/quizzes/:quizId/questions/:questionId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    updateQuestionValidation,
    wrapRequestHandler(classroomController.updateQuestion)
)

classroomRouter.delete(
    '/:id/quizzes/:quizId/questions/:questionId',
    checkIdParamMiddleware,
    isClassroomTeacher,
    wrapRequestHandler(classroomController.deleteQuestion)
)

// ══════════════════════════════════════════════════
// CHAT  GET /classrooms/:id/messages
// ══════════════════════════════════════════════════
// ?limit=50&beforeId=123  (cursor-based — load more)

classroomRouter.get(
    '/:id/messages',
    checkIdParamMiddleware,
    isClassroomMember,
    wrapRequestHandler(classroomController.getChatHistory)
)

export default classroomRouter;
