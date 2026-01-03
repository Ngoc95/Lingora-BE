import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { Topic } from "~/entities/topic.entity"
import { BadRequestError } from "~/core/error.response"

export const getTopicProgressValidation = validate(
  checkSchema({
    id: {
      in: ['params'],
      isInt: {
        errorMessage: 'Topic ID must be an integer',
      },
      toInt: true,
      custom: {
        options: async (value) => {
          const found = await Topic.findOneBy({ id: value })
          if (!found) {
            throw new BadRequestError({ message: 'Topic not found' })
          }
          return true
        },
      },
    },
  })
)
