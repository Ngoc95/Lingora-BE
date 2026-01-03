import { checkSchema } from "express-validator"
import { validate } from "../validation.middlewares"
import { isEmail, isPassword, isUsername } from "../common.middlewares"
import { User } from "~/entities/user.entity"
import { UserStatus } from "~/enums/userStatus.enum"
import { ProficiencyLevel } from "~/enums/proficiency.enum"
import { Role } from "~/entities/role.entity"
import { BadRequestError } from "~/core/error.response"
import { toNumber } from "lodash"

export const updateUserByIdValidation = validate(
  checkSchema({
    username: {
      optional: true,
      ...isUsername,
      custom: {
        options: async (value, { req }) => {
          const foundUser = await User.findOne({ where: { username: value } })
          if (foundUser && foundUser.id !== toNumber(req.params?.id)) {
            throw new BadRequestError({ message: 'Username already in use' })
          }
          return true
        }
      }
    },

    email: {
      optional: true,
      ...isEmail,
      custom: {
        options: async (value, { req }) => {
          const foundUser = await User.findOne({ where: { email: value } })
          if (foundUser && foundUser.id !== toNumber(req.params?.id)) {
            throw new BadRequestError({ message: 'Email already in use' })
          }
          return true
        }
      }
    },

    roleIds: {
      optional: true,
      isArray: {
        errorMessage: 'roleIds must be an array of numbers'
      },
      custom: {
        options: async (values) => {
          if (!Array.isArray(values)) return true
          for (const id of values) {
            const foundRole = await Role.findOneBy({ id })
            if (!foundRole) throw new BadRequestError({ message: `Invalid role id: ${id}` })
          }
          return true
        }
      }
    },

    avatar: {
      optional: true,
      trim: true,
      isString: {
        errorMessage: 'Avatar must be a string (URL)'
      }
    },

    proficiency: {
      optional: {
        options: {
          nullable: true
        }
      },
      isIn: {
        options: [Object.values(ProficiencyLevel)],
        errorMessage: `Proficiency must be one of: ${Object.values(ProficiencyLevel).join(', ')}`
      }
    },

    status: {
      optional: true,
      isIn: {
        options: [Object.values(UserStatus)],
        errorMessage: `Status must be one of: ${Object.values(UserStatus).join(', ')}`
      }
    },

    oldPassword: {
      optional: true,
      isString: true,
      errorMessage: 'Old password must be a string'
    },

    newPassword: {
      optional: true,
      ...isPassword,
      custom: {
        options: async (_, { req }) => {
          const user = await User.findOne({ where: { id: toNumber(req.params?.id) } })
          if (user?.password && !req.body.oldPassword) {
            throw new BadRequestError({ message: 'Old password is required' })
          }
          return true
        }
      }
    }
  })
)