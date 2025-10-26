import { Role } from "~/entities/role.entity"
import { DatabaseService } from "~/services/database.service"

export async function seedRole() {
    const roleRepository = await DatabaseService.getInstance().getRepository(Role)
    const count = await roleRepository.count()
    if (count > 0) {
        console.log('ℹ️ Roles already exist, skipping seed...')
        return
    }

    console.log('🌱 Creating roles...')
    
    const roles = [
        { name: 'ADMIN' },
        { name: 'USER' },
    ]

    const roleEntities = roleRepository.create(roles)
    await roleRepository.save(roleEntities)

    console.log('✅ Seeded roles successfully!')
}