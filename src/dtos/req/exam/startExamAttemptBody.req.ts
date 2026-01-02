import { ExamMode } from "../../../enums/exam.enum";

export interface StartExamAttemptBodyReq {
  mode: ExamMode;
  /**
   * Required when mode = SECTION, ignored for FULL mode.
   */
  sectionId?: number;
  resumeLast?: boolean;
}
