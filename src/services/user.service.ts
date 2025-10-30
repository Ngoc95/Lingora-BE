import bcrypt from 'bcrypt';
import { CreateUserBodyReq } from "~/dtos/req/user/createUserBody.req";
import { DatabaseService } from "./database.service";
import { User } from "~/entities/user.entity";
import { checkDuplicateUser, checkRolesExistence } from "~/utils/validators";
import { unGetData } from "~/utils";

export class UserService {
    private db = DatabaseService.getInstance()

    async createUser({ username, email, password, avatar, roleIds, proficiency }: CreateUserBodyReq) {
        const userRepo = await this.db.getRepository(User)

        // Kiểm tra trùng username/email
        await checkDuplicateUser(email, username)

        // Kiểm tra roles hợp lệ
        const foundRoles = await checkRolesExistence(roleIds)

        // Hash mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10)

        // Tạo user mới
        const newUser = userRepo.create({
            username,
            email,
            password: hashedPassword,
            avatar: avatar || 'N/A',
            roles: foundRoles,
            proficiency,
        })

        return unGetData({ fields: ['password'], object: await User.save(newUser) })
    }
}
export const userService = new UserService()