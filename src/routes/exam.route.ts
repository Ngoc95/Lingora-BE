import { Router } from "express";
import { examController } from "~/controllers/exam.controller";
import {
  accessTokenValidation,
  checkPermission,
} from "~/middlewares/auth.middlewares";
import { Resource } from "~/enums/resource.enum";

const examRouter = Router();

// Public exam browsing
examRouter.get("/exams", examController.listExams);
examRouter.get("/exams/:examId", examController.getExamDetail);
examRouter.get(
  "/exams/:examId/sections/:sectionId",
  examController.getSectionDetail
);

// Candidate workflow
examRouter.post(
  "/exams/:examId/start",
  accessTokenValidation,
  examController.startExamAttempt
);
examRouter.post(
  "/exam-attempts/:attemptId/sections/:sectionId/submit",
  accessTokenValidation,
  examController.submitSectionAttempt
);
examRouter.post(
  "/exam-attempts/:attemptId/submit",
  accessTokenValidation,
  examController.submitExamAttempt
);
examRouter.get(
  "/exam-attempts",
  accessTokenValidation,
  examController.listExamAttempts
);
examRouter.get(
  "/exam-attempts/:attemptId",
  accessTokenValidation,
  examController.getExamAttemptDetail
);

// Admin import
examRouter.post(
  "/admin/exams/import",
  accessTokenValidation,
  checkPermission("createAny", Resource.EXAM),
  examController.importExam
);

export default examRouter;
