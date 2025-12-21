import { Router } from "express";
import { examController } from "~/controllers/exam.controller";
import {
  accessTokenValidation,
  checkPermission,
  optionalAccessToken,
} from "~/middlewares/auth.middlewares";
import { Resource } from "~/enums/resource.enum";

const examRouter = Router();

// Public exam browsing
examRouter.get("/exams", examController.listExams);
examRouter.get("/exams/:examId", optionalAccessToken, examController.getExamDetail);
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

import { dtoValidation } from "~/middlewares/dtoValidation.middleware";
import { ImportExamBodyReq } from "~/dtos/req/exam/importExamBody.req";

// Admin import
examRouter.post(
  "/admin/exams/import",
  accessTokenValidation,
  checkPermission("createAny", Resource.EXAM),
  dtoValidation(ImportExamBodyReq),
  examController.importExam
);

examRouter.delete(
  "/admin/exams/:examId",
  accessTokenValidation,
  checkPermission("deleteAny", Resource.EXAM),
  examController.deleteExam
);

examRouter.patch(
  "/admin/exams/:examId",
  accessTokenValidation,
  checkPermission("updateAny", Resource.EXAM),
  examController.updateExam
);

examRouter.get(
  "/admin/exam-attempts",
  accessTokenValidation,
  checkPermission("readAny", Resource.EXAM),
  examController.adminListExamAttempts
);

examRouter.get(
  "/admin/exam-attempts/:attemptId",
  accessTokenValidation,
  checkPermission("readAny", Resource.EXAM),
  examController.adminGetExamAttemptDetail
);

export default examRouter;
