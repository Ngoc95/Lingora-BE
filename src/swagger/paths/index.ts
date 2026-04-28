import { authPaths } from './auth'
import { usersPaths } from './users'
import { learningPaths } from './learning'
import { progressPaths } from './progress'
import { studySetsPaths } from './studysets'
import { examsPaths } from './exams'
import { classroomsPaths } from './classrooms'
import { conversationsPaths } from './conversations'
import { communityPaths } from './community'
import { miscPaths } from './misc'

export const allPaths = {
  ...authPaths,
  ...usersPaths,
  ...learningPaths,
  ...progressPaths,
  ...studySetsPaths,
  ...examsPaths,
  ...classroomsPaths,
  ...conversationsPaths,
  ...communityPaths,
  ...miscPaths,
}
