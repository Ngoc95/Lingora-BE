import { AccessControl } from 'accesscontrol'
import { Resource } from '~/enums/resource.enum'
import { RoleName } from '~/enums/role.enum'

const ac = new AccessControl()

// ========================
// LEARNER (Học viên)
// ========================
ac.grant(RoleName.LEARNER)
  .readOwn(Resource.PROFILE)
  .updateOwn(Resource.PROFILE)
  .readAny(Resource.CATEGORY)
  .readAny(Resource.TOPIC)
  .readAny(Resource.WORD)
  .readAny(Resource.STUDY_SET)
  .updateOwn(Resource.STUDY_SET)
  .deleteOwn(Resource.STUDY_SET)
  .createOwn(Resource.STUDY_SET)
  .readOwn(Resource.USER_PROGRESS)
  .createOwn(Resource.USER_PROGRESS)
  .updateOwn(Resource.USER_PROGRESS)

// ========================
// TEACHER (Giáo viên)
// ========================
// ac.grant(RoleName.TEACHER)
//   .extend(RoleName.LEARNER)
//   .createAny(Resource.COURSE)
//   .updateOwn(Resource.COURSE)
//   .deleteOwn(Resource.COURSE)
//   .createAny(Resource.LESSON)
//   .updateOwn(Resource.LESSON)
//   .deleteOwn(Resource.LESSON)
//   .readAny(Resource.USER)

// ========================
// ADMIN (Quản trị viên)
// ========================
ac.grant(RoleName.ADMIN)
//   .extend(RoleName.TEACHER)
  .extend(RoleName.LEARNER)
  .createAny(Resource.USER)
  .updateAny(Resource.USER)
  .deleteAny(Resource.USER)
  .readAny(Resource.USER)
  .createAny(Resource.CATEGORY)
  .updateAny(Resource.CATEGORY)
  .deleteAny(Resource.CATEGORY)
  .createAny(Resource.TOPIC)
  .updateAny(Resource.TOPIC)
  .deleteAny(Resource.TOPIC)
  .createAny(Resource.WORD)
  .updateAny(Resource.WORD)
  .deleteAny(Resource.WORD)


export default ac
