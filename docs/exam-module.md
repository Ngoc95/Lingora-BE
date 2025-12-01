# Exam Practice Module (IELTS-first, exam-agnostic)

This module lets learners take IELTS-style practice tests now while keeping the schema generic for future exams (TOEIC, TOEFL, …). It covers content storage, learner attempts, scoring, and admin import tooling.

## 1. Domain model

| Entity              | Purpose                                  | Notes                                                                                                                                                                                                         |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Exam`              | Top-level exam metadata                  | `examType`, `code`, `title`, `level`, `isPublished`, `metadata` (e.g., IELTS reading variant).                                                                                                                |
| `ExamSection`       | Listening/Reading/Writing/Speaking parts | Holds `sectionType`, duration, instructions, and the section-wide audio URL (single listening file).                                                                                                          |
| `ExamSectionGroup`  | Passages, listening parts, writing tasks | Stores long-form `content`, optional `resourceUrl` (PDF, diagram, etc.), and `groupType`.                                                                                                                     |
| `ExamQuestion`      | Individual questions                     | Links to a group; `questionType` includes the common IELTS tasks plus extended ones (note completion, diagram labeling, etc.). Objective questions carry `correctAnswer`; subjective ones rely on AI scoring. |
| `ExamAttempt`       | A user’s run at an exam                  | Tracks `mode` (SECTION or FULL), status, timestamps, per-section progress/bands, and summary scores.                                                                                                          |
| `ExamAttemptAnswer` | Saved answers                            | Stores raw answer payload, correctness/score, optional `aiFeedback`, and references both the question and section.                                                                                            |

## 2. API surface (router: `src/routes/exam.route.ts`)

### Public browsing

- `GET /exams` — filter by `examType`, `isPublished`, search title/description, paginate.
- `GET /exams/:examId` — exam metadata + section list (no answers).
- `GET /exams/:examId/sections/:sectionId` — section details (groups/questions without correct answers for learners).

### Learner workflow

- `POST /exams/:examId/start` (auth)  
  Body `{ mode: "SECTION"|"FULL", sectionId?, resumeLast? }`. Creates or resumes an `ExamAttempt`.
- `POST /exam-attempts/:attemptId/sections/:sectionId/submit` (auth)  
  Body `{ answers: [{ questionId, answer }, ...] }`. Accepts the whole section in one shot, scores objective questions, snapshots section progress.
- `POST /exam-attempts/:attemptId/submit` (auth)  
  Finalizes the attempt (verifies all sections done if `mode=FULL`), recomputes band summaries, sets status to `SUBMITTED`.
- `GET /exam-attempts` / `GET /exam-attempts/:attemptId` (auth) — history + detailed review (answers, explanations, AI feedback).

### Admin tooling

- `POST /admin/exams/import` (auth + `createAny(Resource.EXAM)`)  
  Accepts a single JSON payload (see DTO `ImportExamBodyReq`) containing exam meta, sections, groups, and questions, then persists everything via cascading saves. Use CDN URLs for audio/pdfs/diagrams in `audioUrl` or `resourceUrl`.

> There is intentionally **no granular CRUD** yet: admins prepare JSON offline (e.g., Notion/Sheet + export) and import one exam at a time, which is easier than editing on small screens.

## 3. Scoring strategy

Implemented in `exam.service.ts#buildScoreSummary`.

1. **Objective sections (Listening/Reading):**
   - Compare submitted answers to `correctAnswer` (case-insensitive strings or ordered arrays).
   - Track `correctCount`, `totalQuestions`, `earnedScore`.
   - For IELTS tests, convert raw correct answers to bands using the tables in `src/constants/exam.ts` (separate Academic vs General reading via `exam.metadata.readingVariant`).
2. **Subjective sections (Writing/Speaking):**
   - Currently stored without auto-bands; plan is to call `ai-service` during section submission and populate `ExamAttemptAnswer.aiFeedback` plus section-level band in `scoreSummary`.
3. **Overall band (IELTS):** Average available skill bands (listening, reading, writing, speaking) and round to the nearest .0/.5 using IELTS rules.

## 4. Learner UX rules enforced server-side

- **Section mode:** `targetSectionId` is locked; user can only submit that section once, matching “finish section locally then submit”.
- **Full test mode:** attempt cannot be finalized until every section in the exam reports `status=COMPLETED` in `sectionProgress`.
- **Single listening audio:** `ExamSection.audioUrl` holds the continuous file for that section. Groups describe parts but don’t duplicate audio.

## 5. Adding new content

1. Prepare JSON like:

   ```json
   {
     "examType": "IELTS",
     "code": "IELTS-MOCK-001",
     "title": "Cambridge-style Mock 1",
     "isPublished": true,
     "metadata": { "readingVariant": "ACADEMIC" },
     "sections": [
       {
         "sectionType": "LISTENING",
         "title": "Listening",
         "durationSeconds": 2400,
         "audioUrl": "https://cdn/audio/mock1-listening.mp3",
         "groups": [
           {
             "groupType": "LISTENING_PART",
             "title": "Section 1",
             "description": "Questions 1-10",
             "questions": [
               {
                 "questionType": "SHORT_ANSWER",
                 "prompt": "Write NO MORE THAN TWO WORDS...",
                 "correctAnswer": "Cambridge"
               }
             ]
           }
         ]
       }
     ]
   }
   ```

2. Call `POST /admin/exams/import` with that body (authorized admin token).  
   The response mirrors `GET /exams/:id`, so you can verify data immediately.

## 6. Extensibility roadmap

- **Additional exams:** add new `ExamType` values and scoring strategies (e.g., TOEIC raw-to-score tables). The schema already supports per-exam metadata for handling different rules.
- **AI scoring:** integrate writing/speaking evaluation by extending `submitSectionAttempt` to call `aiService` for subjective question types and store `aiFeedback`.
- **Admin utilities:** optional future work includes CRUD endpoints, content previews, and import validation tooling.
- **Section review UX:** UI can show `scoreSummary.sections` entries to render band charts, error breakdowns, and transcripts/audio as needed.

## 7. Files of interest

- Entities: `src/entities/exam*.entity.ts`
- Enums: `src/enums/exam.enum.ts`
- Service: `src/services/exam.service.ts`
- Controller: `src/controllers/exam.controller.ts`
- Routes: `src/routes/exam.route.ts`
- Constants (band tables): `src/constants/exam.ts`
- DTOs: `src/dtos/req/exam/*`

This document should be the entry point for anyone wiring FE screens, seeding exams, or extending the scoring logic.
