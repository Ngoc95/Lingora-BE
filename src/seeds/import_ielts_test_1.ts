import { DatabaseService } from '../services/database.service';
import { examService } from '../services/exam.service';
import { Exam } from '../entities/exam.entity';
import ieltsTest1_data from '../data/IELTS_Test_1.json';
import { ImportExamBodyReq } from '../dtos/req/exam/importExamBody.req';

export async function seedIeltsTest1() {
  const db = DatabaseService.getInstance();
  const examRepo = db.dataSource.getRepository(Exam);
  
  // Check if exam already exists by code
  const existingExam = await examRepo.findOne({
    where: { code: ieltsTest1_data.code }
  });

  if (existingExam) {
    console.log(`ℹ️ Exam ${ieltsTest1_data.code} already exists, skipping seed...`);
    return;
  }

  console.log(`🌱 Seeding Exam: ${ieltsTest1_data.title}...`);
  
  try {
    await examService.importExam(ieltsTest1_data as unknown as ImportExamBodyReq);
    console.log('✅ Seeded IELTS Test 1 successfully!');
  } catch (error) {
    console.error('❌ Failed to seed IELTS Test 1:', error);
  }
}
