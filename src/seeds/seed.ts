import { seedCategoriesAndTopics } from "./categoryTopic.seed";
import { seedRole } from "./role.seed";
import { seedUsers } from "./user.seed";
import { saveCachedWordsToDB } from "./word.seed";

export async function seedInitialData() {
  await seedRole();
  await seedUsers();
  await seedCategoriesAndTopics();
  await saveCachedWordsToDB();

  console.log("🌱 Initial data setup complete!");
}
