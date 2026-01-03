import { PostStatus } from "~/enums/postStatus.enum"
import { PostTopic } from "~/enums/postTopic.enum"

export class UpdatePostBodyReq {
    title?: string
    content?: string
    topic?: PostTopic
    thumbnails?: string[]
    tags?: string[]
    status?: PostStatus
}
