import { faker } from "@faker-js/faker"
import { hash } from "bcrypt"
import { Role } from "~/entities/role.entity"
import { User } from "~/entities/user.entity"
import { ProficiencyLevel } from "~/enums/proficiency.enum"
import { RoleName } from "~/enums/role.enum"
import { UserStatus } from "~/enums/userStatus.enum"

export async function seedUsers() {
    console.log('🌱 Ensuring core users exist...')

    // lấy role từ DB
    const adminRole = await Role.findOne({ where: { name: RoleName.ADMIN } })
    const learnerRole = await Role.findOne({ where: { name: RoleName.LEARNER } })

    if (!adminRole || !learnerRole) {
        console.error('❌ Roles not found. Please seed roles first.')
        return
    }

    const coreUsers = [
        {
            email: 'admin001@gmail.com',
            username: 'Admin001',
            password: 'Admin123',
            roles: [adminRole],
            proficiency: ProficiencyLevel.ADVANCED
        },
        {
            email: 'user001@gmail.com',
            username: 'User001',
            password: 'User123',
            roles: [learnerRole],
            proficiency: ProficiencyLevel.INTERMEDIATE
        },
        {
            email: 'user002@gmail.com',
            username: 'User002',
            password: 'User123',
            roles: [learnerRole],
            proficiency: ProficiencyLevel.INTERMEDIATE
        },
        {
            email: 'ngoc001@gmail.com',
            username: 'Ngoc001',
            password: 'Ngoc123',
            roles: [adminRole, learnerRole],
            proficiency: ProficiencyLevel.BEGINNER
        }
    ]

    for (const data of coreUsers) {
        const existing = await User.findOne({ where: { email: data.email } })
        if (!existing) {
            console.log(`👤 Creating user: ${data.username}...`)
            const user = User.create({
                ...data,
                password: await hash(data.password, 10),
                status: UserStatus.ACTIVE
            })
            await user.save()
        }
    }

    // --- 30 user random (only if less than 30 total users) ---
    const totalCount = await User.count()
    if (totalCount < 30) {
        const remaining = 30 - totalCount
        console.log(`🎲 Seeding ${remaining} random users...`)
        const randomUsers: User[] = []
        for (let i = 1; i <= remaining; i++) {
            const username = faker.internet.username()
            const email = faker.internet.email({ firstName: username })
            const password = await hash('User123', 10)
            const status = UserStatus.ACTIVE 
            
            const random = Math.random()
            let roles = [learnerRole]
            if (random > 0.9) roles = [adminRole, learnerRole]
            else if (random > 0.7) roles = [adminRole]

            const proficiencyLevels = Object.values(ProficiencyLevel)
            const proficiency = faker.helpers.arrayElement(proficiencyLevels)

            const user = User.create({ email, username, password, roles, status, proficiency })
            randomUsers.push(user)
        }
        await User.save(randomUsers)
    }

    console.log('✅ User seeding complete!')
}
