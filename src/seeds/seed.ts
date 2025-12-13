import { seedCategoriesAndTopics } from "./categoryTopic.seed";
import { seedRole } from "./role.seed";
import { seedUsers } from "./user.seed";
import { saveCachedWordsToDB } from "./word.seed";
import { seedIeltsTest1 } from "./import_ielts_test_1";

export async function seedInitialData() {
  await seedRole();
  await seedUsers();
  await seedCategoriesAndTopics();
  await saveCachedWordsToDB();
  await seedIeltsTest1();

  console.log("🌱 Initial data setup complete!");
}
