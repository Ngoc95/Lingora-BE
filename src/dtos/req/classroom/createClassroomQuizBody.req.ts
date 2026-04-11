export interface CreateClassroomQuizBodyReq {
    title: string
    description?: string
    lessonId?: number
    timeLimitSeconds?: number
    maxAttempts?: number
    passingScore?: number
    isPublished?: boolean
    opensAt?: Date
    closesAt?: Date
}
