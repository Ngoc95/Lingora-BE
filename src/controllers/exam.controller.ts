import { Request, Response } from "express";
import { CREATED, SuccessResponse } from "~/core/success.response";
import { examService } from "~/services/exam.service";
import { ExamType } from "~/enums/exam.enum";
import { GetExamListQueryReq } from "~/dtos/req/exam/getExamListQuery.req";
import { StartExamAttemptBodyReq } from "~/dtos/req/exam/startExamAttemptBody.req";
import { SubmitExamSectionBodyReq } from "~/dtos/req/exam/submitExamSectionBody.req";
import { ImportExamBodyReq, ImportExamBulkBodyReq } from "~/dtos/req/exam/importExamBody.req";

class ExamController {
  listExams = async (req: Request, res: Response) => {
    const query = req.query || {};
    const parsedQuery: GetExamListQueryReq = {
      examType: query.examType as ExamType,
      search: query.search as string,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    };

    if (typeof query.isPublished !== "undefined") {
      const rawValue = Array.isArray(query.isPublished)
        ? query.isPublished[0]
        : query.isPublished;
      if (typeof rawValue === "string") {
        parsedQuery.isPublished = ["true", "1", "yes"].includes(
          rawValue.toLowerCase()
        );
      } else if (typeof rawValue === "boolean") {
        parsedQuery.isPublished = rawValue;
      }
    }

    const metaData = await examService.listExams(parsedQuery);

    return new SuccessResponse({
      message: "Get exams successfully",
      metaData,
    }).send(res);
  };

  getExamDetail = async (req: Request, res: Response) => {
    const examId = Number(req.params.examId);
    const userId = req.user?.id;
    const metaData = await examService.getExamDetail(examId, userId);

    return new SuccessResponse({
      message: "Get exam detail successfully",
      metaData,
    }).send(res);
  };

  getSectionDetail = async (req: Request, res: Response) => {
    const examId = Number(req.params.examId);
    const sectionId = Number(req.params.sectionId);
    const metaData = await examService.getSectionDetail(examId, sectionId);

    return new SuccessResponse({
      message: "Get exam section successfully",
      metaData,
    }).send(res);
  };

  startExamAttempt = async (req: Request, res: Response) => {
    const examId = Number(req.params.examId);
    const body = req.body as StartExamAttemptBodyReq;
    const metaData = await examService.startExamAttempt(
      req.user!.id,
      examId,
      body
    );

    return new SuccessResponse({
      message: "Start exam attempt successfully",
      metaData,
    }).send(res);
  };

  submitSectionAttempt = async (req: Request, res: Response) => {
    const attemptId = Number(req.params.attemptId);
    const sectionId = Number(req.params.sectionId);
    const body = req.body as SubmitExamSectionBodyReq;

    const metaData = await examService.submitSectionAttempt(
      attemptId,
      sectionId,
      req.user!.id,
      body
    );

    return new SuccessResponse({
      message: "Submit section successfully",
      metaData,
    }).send(res);
  };

  submitExamAttempt = async (req: Request, res: Response) => {
    const attemptId = Number(req.params.attemptId);
    const metaData = await examService.finalizeAttempt(attemptId, req.user!.id);

    return new SuccessResponse({
      message: "Submit exam attempt successfully",
      metaData,
    }).send(res);
  };

  listExamAttempts = async (req: Request, res: Response) => {
    const q = req.query || {};
    const page = q.page ? Number(q.page) : undefined;
    const limit = q.limit ? Number(q.limit) : undefined;
    const metaData = await examService.listAttempts(req.user!.id, { page, limit });

    return new SuccessResponse({
      message: "Get exam attempts successfully",
      metaData,
    }).send(res);
  };

  getExamAttemptDetail = async (req: Request, res: Response) => {
    const attemptId = Number(req.params.attemptId);
    const metaData = await examService.getAttemptDetail(
      attemptId,
      req.user!.id
    );

    return new SuccessResponse({
      message: "Get exam attempt detail successfully",
      metaData,
    }).send(res);
  };

  importExam = async (req: Request, res: Response) => {
    const raw = req.body as unknown;
    if (Array.isArray(raw)) {
      const body = raw as ImportExamBulkBodyReq;
      const metaData = await examService.importExams(body);
      return new CREATED({
        message: "Import exams successfully",
        metaData,
      }).send(res);
    } else {
      const body = raw as ImportExamBodyReq;
      const metaData = await examService.importExam(body);
      return new CREATED({
        message: "Import exam successfully",
        metaData,
      }).send(res);
    }
  };
}

export const examController = new ExamController();
