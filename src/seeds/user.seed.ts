import { faker } from "@faker-js/faker"
import { hash } from "bcrypt"
import { Role } from "~/entities/role.entity"
import { User } from "~/entities/user.entity"
import { ProficiencyLevel } from "~/enums/proficiency.enum"
import { RoleName } from "~/enums/role.enum"
import { UserStatus } from "~/enums/userStatus.enum"

export async function seedUsers() {
    const count = await User.count()
    if (count > 0) {
        console.log('ℹ️ Users already exist, skipping seed...')
        return
    }

    console.log('🌱 Creating users...')

    // lấy role từ DB
    const adminRole = await Role.findOne({ where: { name: RoleName.ADMIN } })
    const userRole = await Role.findOne({ where: { name: RoleName.USER } })

    if (!adminRole || !userRole) {
        console.error('❌ Roles not found. Please seed roles first.')
        return
    }

    const admin = User.create({
        email: 'Admin001@gmail.com',
        username: 'Admin001',
        password: await hash('Admin123', 10), // hash mật khẩu
        roles: [adminRole],
        status: UserStatus.ACTIVE,
        proficiency: ProficiencyLevel.ADVANCED
    })

    const user = User.create({
        email: 'User001@gmail.com',
        username: 'User001',
        password: await hash('User123', 10),
        roles: [userRole],
        status: UserStatus.ACTIVE,
        proficiency: ProficiencyLevel.INTERMEDIATE
    })

    const allRolesUser = User.create({
        email: 'ngoc001@gmail.com',
        username: 'Ngoc001',
        password: await hash('Ngoc123', 10),
        roles: [adminRole, userRole],
        status: UserStatus.ACTIVE,
        proficiency: ProficiencyLevel.BEGINNER
    })

    const users: User[] = [admin, user, allRolesUser]

    // --- 30 user random ---
    for (let i = 1; i <= 30; i++) {
        const username = faker.internet.username()
        const email = faker.internet.email({ firstName: username })
        const password = await hash('User123', 10) // cho tất cả pass chung
        const status = UserStatus.ACTIVE 

        const random = Math.random()

        let roles = [userRole]
        if (random > 0.9) roles = [adminRole, userRole] // 10%
        else if (random > 0.7) roles = [adminRole] // 20%
        // còn lại 70% là user

        // random proficiency
        const proficiencyLevels = Object.values(ProficiencyLevel)
        const proficiency = faker.helpers.arrayElement(proficiencyLevels)

        const user = User.create({
            email,
            username,
            password,
            roles,
            status,
            proficiency
        })
        users.push(user)
    }

    await User.save(users)

    console.log('✅ Seeded users successfully!')
}