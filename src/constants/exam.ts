import { ExamSectionType } from "../enums/exam.enum";

type BandRange = { min: number; max: number; band: number };

export const IELTS_LISTENING_BAND_TABLE: BandRange[] = [
  { min: 39, max: 40, band: 9 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8 },
  { min: 32, max: 34, band: 7.5 },
  { min: 30, max: 31, band: 7 },
  { min: 26, max: 29, band: 6.5 },
  { min: 23, max: 25, band: 6 },
  { min: 18, max: 22, band: 5.5 },
  { min: 16, max: 17, band: 5 },
  { min: 13, max: 15, band: 4.5 },
  { min: 11, max: 12, band: 4 },
  { min: 8, max: 10, band: 3.5 },
  { min: 6, max: 7, band: 3 },
  { min: 4, max: 5, band: 2.5 },
  { min: 0, max: 3, band: 2 },
];

export const IELTS_READING_ACADEMIC_BAND_TABLE: BandRange[] = [
  { min: 39, max: 40, band: 9 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6 },
  { min: 19, max: 22, band: 5.5 },
  { min: 15, max: 18, band: 5 },
  { min: 13, max: 14, band: 4.5 },
  { min: 10, max: 12, band: 4 },
  { min: 8, max: 9, band: 3.5 },
  { min: 6, max: 7, band: 3 },
  { min: 4, max: 5, band: 2.5 },
  { min: 0, max: 3, band: 2 },
];

export const IELTS_READING_GENERAL_BAND_TABLE: BandRange[] = [
  { min: 40, max: 40, band: 9 },
  { min: 39, max: 39, band: 8.5 },
  { min: 38, max: 38, band: 8 },
  { min: 36, max: 37, band: 7.5 },
  { min: 34, max: 35, band: 7 },
  { min: 32, max: 33, band: 6.5 },
  { min: 30, max: 31, band: 6 },
  { min: 27, max: 29, band: 5.5 },
  { min: 23, max: 26, band: 5 },
  { min: 19, max: 22, band: 4.5 },
  { min: 15, max: 18, band: 4 },
  { min: 12, max: 14, band: 3.5 },
  { min: 10, max: 11, band: 3 },
  { min: 8, max: 9, band: 2.5 },
  { min: 0, max: 7, band: 2 },
];

export const DEFAULT_SECTION_SCORE_KEY = {
  [ExamSectionType.LISTENING]: "listening",
  [ExamSectionType.READING]: "reading",
  [ExamSectionType.WRITING]: "writing",
  [ExamSectionType.SPEAKING]: "speaking",
  [ExamSectionType.GENERAL]: "general",
};

export const computeBandFromTable = (raw: number, table: BandRange[]) => {
  const entry = table.find((range) => raw >= range.min && raw <= range.max);
  return entry?.band ?? 0;
};
