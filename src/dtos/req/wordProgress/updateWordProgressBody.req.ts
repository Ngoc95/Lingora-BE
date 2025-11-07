export interface UpdateWordProgressBodyReq {
  wordProgress: UpdateWordProgressData[]
}

export interface UpdateWordProgressData {
  wordId: number;
  wrongCount?: number;
  reviewedDate: Date
}
