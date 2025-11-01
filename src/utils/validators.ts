import { In } from "typeorm"
import { BadRequestError } from "~/core/error.response"
import { Role } from "~/entities/role.entity"
import { User } from "~/entities/user.entity"
import { DatabaseService } from "~/services/database.service"

export async function checkUserExistence(userId: number) {
    const userRepository = await DatabaseService.getInstance().getRepository(User)
    const user = await userRepository.findOne({
        where: { id: userId }
    })
    if (!user) {
        throw new BadRequestError({ message: 'Invalid user' })
    }
    if (user.deletedAt) {
        throw new BadRequestError({ message: 'User already deleted' })
    }
    return user
}

export async function checkRolesExistence(roleIds: number[]) {
    if (!Array.isArray(roleIds) || roleIds.length === 0) {
        throw new BadRequestError({ message: 'rolesId cannot be empty!' })
    }

    const roleRepository = await DatabaseService.getInstance().getRepository(Role)

    // Tìm các role theo id
    const roles = await roleRepository.find({
        where: { id: In(roleIds) }
    })

    // Kiểm tra tồn tại
    if (roles.length !== roleIds.length) {
        throw new BadRequestError({ message: 'One or more roles not found' })
    }

    return roles
}

export async function checkDuplicateUser(email: string, username: string) {
    const userRepository = await DatabaseService.getInstance().getRepository(User)
    const existingUser = await userRepository.findOne({
        where: [{ email }, { username }]
    })
    if (existingUser) {
        throw new BadRequestError({ message: 'Username or email already exists' })
    }
}