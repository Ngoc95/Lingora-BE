import { checkSchema } from 'express-validator'
import { Category } from '~/entities/category.entity'
import { BadRequestError } from '~/core/error.response'
import { validate } from '../validation.middlewares'

export const getCategoryProgressValidation = validate(
  checkSchema(
    {
      id: {
        in: ['params'],
        isInt: {
          errorMessage: 'Category ID must be an integer',
        },
        toInt: true,
        custom: {
          options: async (value) => {
            const category = await Category.findOne({ where: { id: value } })
            if (!category) {
              throw new BadRequestError({ message: 'Category not found' })
            }
            return true
          },
        },
      },
    },
    ['params']
  )
)
