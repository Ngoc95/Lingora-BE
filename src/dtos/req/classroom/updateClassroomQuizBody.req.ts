export interface UpdateClassroomQuizBodyReq {
    title?: string
    description?: string
    lessonId?: number | null
    timeLimitSeconds?: number | null
    maxAttempts?: number
    passingScore?: number
    isPublished?: boolean
    opensAt?: Date | null
    closesAt?: Date | null
}
