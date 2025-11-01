import bcrypt from 'bcrypt';
import { CreateUserBodyReq } from "~/dtos/req/user/createUserBody.req";
import { DatabaseService } from "./database.service";
import { User } from "~/entities/user.entity";
import { checkDuplicateUser, checkRolesExistence, checkUserExistence } from "~/utils/validators";
import { unGetData } from "~/utils";
import { hashData } from "~/utils/jwt";
import { UserQueryReq } from "~/dtos/req/user/userQuery.req";
import { FindOptionsWhere, Like } from "typeorm";
import validator from "validator";
import { UpdateUserBodyReq } from "~/dtos/req/user/updateUserBody.req";
import { Role } from "~/entities/role.entity";
import { BadRequestError } from "~/core/error.response";
import { UserStatus } from '~/enums/userStatus.enum';

export class UserService {
    private db = DatabaseService.getInstance()

    async createUser({ username, email, password, avatar, roleIds, proficiency }: CreateUserBodyReq) {
        const userRepo = await this.db.getRepository(User)

        // Kiểm tra trùng username/email
        await checkDuplicateUser(email, username)

        // Kiểm tra roles hợp lệ
        const foundRoles = await checkRolesExistence(roleIds)

        // Tạo user mới
        const newUser = userRepo.create({
            username,
            email,
            password: hashData(password),
            avatar: avatar || 'N/A',
            roles: foundRoles,
            proficiency,
        })

        return unGetData({ fields: ['password'], object: await userRepo.save(newUser) })
    }

    getAllUsers = async ({ page = 1, limit = 20, search, proficiency, status, sort }: UserQueryReq) => {
        const skip = (page - 1) * limit

        let where: FindOptionsWhere<User>[] | FindOptionsWhere<User> = []

        // Nếu có search -> OR điều kiện username, email
        if (search) {
            const normalizedSearch = validator
                .trim(search)               // bỏ khoảng trắng đầu cuối
                .toLowerCase();             // đưa về chữ thường

            where = [
                { username: Like(`%${normalizedSearch}%`) },
                { email: Like(`%${normalizedSearch}%`) },
            ];
        }

        // Các filter khác (proficiency, status)
        const applyFilters = (cond: FindOptionsWhere<User>) => {
            if (proficiency) cond.proficiency = proficiency;
            if (status) cond.status = status;

            return cond;
        };

        let finalWhere: FindOptionsWhere<User>[] | FindOptionsWhere<User>;
        if (Array.isArray(where) && where.length > 0) {
            finalWhere = where.map(applyFilters); // mỗi điều kiện search + filters
        } else {
            finalWhere = applyFilters({});
        }

        // nếu ko có sort thì sort mặc định theo id
        if (!sort) 
            sort = { id: 'ASC' as const } 

        const [users, total] = await User.findAndCount({
            skip,
            take: limit,
            relations: ['roles'],
            where: finalWhere,
            order: sort,
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                roles: true,
                proficiency: true,
                status: true,
            }
        })
        return {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            users
        }
    }

    getUserById = async (id: number) => {
        const user = await User.findOne({
            where: {
                id
            },
            relations: ['roles']
        })

        return unGetData({ fields: ['password'], object: user ?? {} })
    }

    updateUserById = async (
        id: number,
        { username, email, newPassword, oldPassword, avatar, roleIds, proficiency, status }: UpdateUserBodyReq
    ) => {
        const userRepo = await this.db.getRepository(User)
        const roleRepo = await this.db.getRepository(Role)

        // Tìm user
        const user = await userRepo.findOne({
            where: { id },
            relations: ['roles']
        })
        if (!user) throw new BadRequestError({ message: 'User not found' })

        // Cập nhật thông tin cơ bản
        if (username) user.username = username
        if (email) user.email = email
        if (avatar) user.avatar = avatar
        if (proficiency) user.proficiency = proficiency
        if (status) user.status = status

        // Nếu có đổi mật khẩu
        if (newPassword && oldPassword) {
            const match = await bcrypt.compare(oldPassword, user.password)
            if (!match) throw new BadRequestError({ message: 'Old password incorrect' })
            user.password = await hashData(newPassword)
        }

        // Nếu có cập nhật role 
        if (roleIds && roleIds.length > 0) {
            const roles = await roleRepo.findByIds(roleIds)
            user.roles = roles
        }

        // Lưu thay đổi
        await userRepo.save(user)

        return unGetData({ fields: ['password'], object: user })
    }

    restoreUserById = async (id: number) => {
        const userRepo = await this.db.getRepository(User)

        // lấy luôn bản ghi đã xóa
        const user = await userRepo.findOne({
            where: { id },
            withDeleted: true
        })

        if (!user) throw new BadRequestError({ message: 'User not found' })
        if (!user.deletedAt) throw new BadRequestError({ message: 'User is not deleted' })

        user.status = UserStatus.ACTIVE
        await userRepo.save(user)

        return await userRepo.restore(id)
    }

    deleteUserById = async (id: number) => {
        const userRepo = await this.db.getRepository(User)
        const user = await checkUserExistence(id)

        user.status = UserStatus.DELETED
        await userRepo.save(user)
        return await userRepo.softDelete(id)
    }
}
export const userService = new UserService()