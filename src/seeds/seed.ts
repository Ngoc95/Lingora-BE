import { seedCategoriesAndTopics } from "./categoryTopic.seed";
import { seedRole } from "./role.seed";
import { seedUsers } from "./user.seed";
import { saveCachedWordsToDB } from "./word.seed";
import { seedIeltsTest1 } from "./import_ielts_test_1";
import { seedConversationContexts } from "./conversationContext.seed";
import { seedClassroomData } from "./classroom.seed";

import { seedPostAndStudySetForUser001 } from "./post_studyset.seed";
import { seedRankingData } from "./ranking.seed";

export async function seedInitialData() {
  await seedRole();
  await seedUsers();
  await seedCategoriesAndTopics();
  await seedPostAndStudySetForUser001();
  await saveCachedWordsToDB();
  await seedIeltsTest1();

  await seedConversationContexts();
  await seedClassroomData();

  // Ranking must run last — depends on users + classrooms being present.
  await seedRankingData();

  console.log("🌱 Initial data setup complete!");
}
