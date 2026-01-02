import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { BadRequestError } from "../../core/error.response"
import { Topic } from "../../entities/topic.entity"
import { isRequired } from "../common.middlewares"

export const getWordsForStudyValidation = validate(
  checkSchema(
    {
      id: {
        in: ['params'],
        isInt: {
          errorMessage: 'Topic ID must be an integer',
        },
        toInt: true,
        custom: {
          options: async (value) => {
            const topic = await Topic.findOne({ where: { id: value } })
            if (!topic) {
              throw new BadRequestError({ message: 'Topic not found' })
            }
            return true
          },
        },
      },
      count: {
        in: ['query'],
        ...isRequired('count'),
        isInt: {
          errorMessage: 'Count must be an integer',
        },
        toInt: true,
      },
    },
  )
)
