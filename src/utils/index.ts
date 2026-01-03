import _, { toNumber } from 'lodash'
import { User } from '~/entities/user.entity'

export const isValidNumber = (num: string) => !Number.isNaN(parseInt(num))

export const toNumberWithDefaultValue = (num: any, defaultValue: number) => {
    if (!num) return defaultValue
    try {
        const value = toNumber(num)
        if (isNaN(value)) throw new Error('Fail to convert')
        return value
    } catch (error) {
        return defaultValue
    }
}

export const getRandomXElementFrom1ToN = (X: number, N: number) => {
    return _.sampleSize(_.range(1, N), X)
}

// export const generatedUuid = async (length: number) => {
//   if (length <= 0) length = 5 // default
//   const { nanoid } = await import('nanoid')
//   return nanoid(length)
// }

export const getInfoData = ({ fields = [], object = {} }) => {
    return _.pick(object, fields)
}

export const getSelectData = (select = []) => {
    return Object.fromEntries(select.map((el) => [el, 1]))
}
export const unGetData = ({ fields = [], object = {} }: { fields?: Array<string>; object?: object }) => {
    return _.omit(object, fields)
}

export const isValidEnumValue = <T extends object>(value: string, enumObj: T): boolean => {
    return Object.values(enumObj).includes(value as T[keyof T])
}

// export const getIpUser = (req: Request) => {
//   return req.headers['x-forwarded-for'] as string
// }

export async function generateUniqueUsername(baseUsername: string): Promise<string> {
    const finalUsername = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '')
    let counter = 0
    let usernameToCheck = finalUsername

    while (await User.findOneBy({ username: usernameToCheck })) {
        counter++
        usernameToCheck = `${finalUsername}${counter}`
    }

    return usernameToCheck
}