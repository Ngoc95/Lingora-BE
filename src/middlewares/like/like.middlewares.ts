import { BadRequestError } from "~/core/error.response"
import { NextFunction, Request, Response } from 'express'
import { TargetType } from "~/enums/targetType.enum"

export const validateTargetType = (req: Request, res: Response, next: NextFunction) => {
    const targetType = req.query?.targetType as TargetType

    if (!targetType) {
        throw new BadRequestError({ message: 'Target type is required in query params' })
    }

    const validTargetTypes = Object.values(TargetType)
    if (!validTargetTypes.includes(targetType)) {
        throw new BadRequestError({ 
            message: `Invalid target type. Must be one of: ${validTargetTypes.join(', ')}` 
        })
    }

    next()
}

