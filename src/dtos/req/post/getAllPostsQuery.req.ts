import { FindOptionsOrder } from 'typeorm'
import { Post } from '~/entities/post.entity'
import { PostStatus } from '~/enums/postStatus.enum'
import { PostTopic } from '~/enums/postTopic.enum'

export interface GetAllPostsQueryReq {
  page?: number
  limit?: number
  sort?: FindOptionsOrder<Post>
  search?: string
  //filter
  ownerId?: number
  tags?: string[]
  topic?: PostTopic
  status?: PostStatus
}
