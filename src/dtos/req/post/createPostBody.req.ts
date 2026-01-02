import { PostTopic } from '../../../enums/postTopic.enum'

export class CreatePostBodyReq {
    title: string
    content: string
    topic: PostTopic
    thumbnails: string[]
    tags: string[]
}
