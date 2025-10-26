import { seedRole } from "./role.seed";
import { seedUsers } from "./user.seed";

export async function seedInitialData() {
  await seedRole();
  await seedUsers();

  console.log("🌱 Initial data setup complete!");
}
