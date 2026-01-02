import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { parse } from 'csv-parse/sync'
import { Between, DeepPartial } from 'typeorm'
import { DatabaseService } from '../services/database.service'
import { Word } from '../entities/word.entity'
import { Topic } from '../entities/topic.entity'
import { CefrLevel } from '../enums/cefrLevel.enum'
import { WordType } from '../enums/wordType.enum'
const translate = require('@vitalets/google-translate-api')

interface CachedWordData {
  headword: string
  phonetic?: string | null
  cefr: CefrLevel
  type: WordType
  meaning: string
  vnMeaning?: string
  example?: string
  exampleTranslation?: string
  audioUrl?: string | null
  imageUrl?: string | null
  failed?: boolean
  topicId?: number
}

interface CsvWordRow {
  headword: string
  cefr: string
}

interface CacheMetadata {
  lastProcessedIndex: number
  totalProcessed: number
  totalSuccess: number
  totalFailed: number
  lastUpdated: string
}

const cacheDir = path.join(__dirname, '../cache')
const cachePath = path.join(cacheDir, 'word_details_with_vn.json')
const metadataPath = path.join(cacheDir, 'cache_metadata.json')

// =======================================================================
// 🔹 PHASE 2: Lưu toàn bộ cache xuống DB (chỉ chạy khi đã cache đủ)
// =======================================================================
export async function saveCachedWordsToDB() {
  console.log('💾 Saving cached words into database...')
console.log('CWD:', process.cwd())
console.log('CACHE PATH:', cachePath)
console.log('CACHE EXISTS:', fs.existsSync(cachePath))
  if (!fs.existsSync(cachePath)) {
    throw new Error('❌ Cache file not found. Run caching phase first!')
  }

  const cache: Record<string, CachedWordData> = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))

  const db = DatabaseService.getInstance()
  await db.connect()
  const dataSource = db.dataSource
  const wordRepo = dataSource.getRepository(Word)
  const topicRepo = dataSource.getRepository(Topic)

  const topics = await topicRepo.find()
  if (!topics.length) {
    throw new Error('⚠️ No topics found in DB! Run seed categories & topics first!')
  }

  // Lọc chỉ lấy những từ không bị failed
  const validWords = Object.values(cache).filter(w => !w.failed && w.meaning)
  const failedWords = Object.values(cache).filter(w => w.failed || !w.meaning)

  console.log(`📊 Cache summary:`)
  console.log(`   ✅ Valid words: ${validWords.length}`)
  console.log(`   ❌ Failed words: ${failedWords.length}`)
  console.log(`   📦 Total in cache: ${Object.keys(cache).length}`)

  if (validWords.length === 0) {
    console.log('⚠️ No valid words to save!')
    return
  }

  // Kiểm tra từ nào đã tồn tại trong DB
  const existingWords = await wordRepo.find({ select: ['word'] })
  const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()))

  const newWords = validWords.filter(w => !existingWordSet.has(w.headword.toLowerCase()))
  const skippedWords = validWords.length - newWords.length

  if (skippedWords > 0) {
    console.log(`⏭️  Skipping ${skippedWords} words already in DB`)
  }

  if (newWords.length === 0) {
    console.log('ℹ️  All valid words already exist in database!')
    return
  }

  console.log(`📦 Preparing to insert ${newWords.length} new words into DB...`)

  // Chuẩn bị batch insert
  const batch: DeepPartial<Word>[] = []
  for (const wordData of newWords) {
    // Tìm topic theo topicId, nếu không có thì random
    const topic = wordData.topicId
      ? topics.find(t => t.id === wordData.topicId) || topics[Math.floor(Math.random() * topics.length)]
      : topics[Math.floor(Math.random() * topics.length)]

    batch.push({
      word: wordData.headword,
      phonetic: wordData.phonetic || undefined,
      meaning: wordData.meaning,
      vnMeaning: wordData.vnMeaning || undefined,
      type: wordData.type,
      cefrLevel: wordData.cefr,
      example: wordData.example || undefined,
      exampleTranslation: wordData.exampleTranslation || undefined,
      audioUrl: wordData.audioUrl || undefined,
      imageUrl: wordData.imageUrl || undefined,
      topic,
    })
  }

  // Lưu vào DB theo batch nhỏ để tránh quá tải
  const BATCH_SIZE = 100
  let saved = 0

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE)
    const entities = wordRepo.create(chunk)
    await wordRepo.save(entities)
    saved += chunk.length

    if (saved % 500 === 0 || saved === batch.length) {
      console.log(`💾 Saved ${saved}/${batch.length} words...`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Successfully saved ${saved} words into database!`)
  console.log(`   📊 Stats:`)
  console.log(`      - New words saved: ${saved}`)
  console.log(`      - Words skipped (already exist): ${skippedWords}`)
  console.log('='.repeat(60))
}

// // =======================================================================
// // 🔹 Cache một batch
// // =======================================================================
// interface CachedWordData {
//   headword: string
//   phonetic?: string | null
//   cefr: CefrLevel
//   type: WordType
//   meaning: string
//   example?: string
//   exampleTranslation?: string
//   audioUrl?: string | null
//   imageUrl?: string | null
//   failed?: boolean
//   topicId?: number
// }

// interface CsvWordRow {
//   headword: string
//   cefr: string
// }

// interface CacheMetadata {
//   lastProcessedIndex: number
//   totalProcessed: number
//   totalSuccess: number
//   totalFailed: number
//   lastUpdated: string
// }

// const cacheDir = path.join(__dirname, '../cache')
// const cachePath = path.join(cacheDir, 'word_details.json')
// const metadataPath = path.join(cacheDir, 'cache_metadata.json')
// async function cacheBatch(BATCH_LIMIT: number, records: CsvWordRow[], topics: Topic[]) {
//   let cache: Record<string, CachedWordData> = {}
//   if (fs.existsSync(cachePath)) {
//     try {
//       cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
//     } catch {
//       cache = {}
//     }
//   }

//   let metadata: CacheMetadata = {
//     lastProcessedIndex: -1,
//     totalProcessed: 0,
//     totalSuccess: 0,
//     totalFailed: 0,
//     lastUpdated: new Date().toISOString()
//   }
//   if (fs.existsSync(metadataPath)) {
//     try {
//       metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
//     } catch { }
//   }

//   let batchCached = 0
//   const startIndex = metadata.lastProcessedIndex + 1

//   for (let i = startIndex; i < records.length; i++) {
//     const rec = records[i]
//     const headword = rec.headword?.trim()?.toLowerCase()
//     const cefrRaw = rec.cefr?.trim()?.toUpperCase()

//     if (!headword || !cefrRaw) {
//       metadata.lastProcessedIndex = i
//       continue
//     }

//     const cefr = cefrRaw as CefrLevel

//     if (cache[headword]) {
//       metadata.lastProcessedIndex = i
//       continue
//     }

//     try {
//       const { data } = await axios.get(
//         `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(headword)}`
//       )

//       const entry = Array.isArray(data) ? data[0] : data
//       const mainMeaning =
//         (entry.meanings || []).find((m: any) =>
//           Object.values(WordType).includes(m.partOfSpeech)
//         ) || (entry.meanings || [])[0]
//       const def = mainMeaning?.definitions?.[0]

//       if (!def?.definition) {
//         cache[headword] = { headword, cefr, meaning: '', type: WordType.NOUN, failed: true }
//         metadata.totalFailed++
//         metadata.lastProcessedIndex = i
//         continue
//       }

//       const example = def.example || null
//       let exampleTranslation: string | null = null

//       if (example) {
//         try {
//           const transRes = await translate(example, { to: 'vi' })
//           exampleTranslation = transRes?.text || null
//         } catch {
//           exampleTranslation = null
//         }
//       }

//       const topic = topics[Math.floor(Math.random() * topics.length)]

//       cache[headword] = {
//         headword,
//         phonetic: entry.phonetics?.[0]?.text || null,
//         cefr,
//         type: (mainMeaning.partOfSpeech as WordType) || WordType.NOUN,
//         meaning: def.definition,
//         example: example || undefined,
//         exampleTranslation: exampleTranslation || undefined,
//         audioUrl: entry.phonetics?.[0]?.audio || null,
//         imageUrl: null,
//         topicId: topic.id,
//       }

//       batchCached++
//       metadata.totalSuccess++
//       metadata.lastProcessedIndex = i
//       metadata.totalProcessed++

//       if (batchCached % 20 === 0) {
//         metadata.lastUpdated = new Date().toISOString()
//         fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8')
//         fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
//         console.log(`💾 Progress: ${batchCached}/${BATCH_LIMIT} | Total: ${metadata.totalSuccess}/${records.length}`)
//       }

//       await new Promise(r => setTimeout(r, 300))
//     } catch (err: any) {
//       cache[headword] = { headword, cefr, meaning: '', type: WordType.NOUN, failed: true }
//       metadata.totalFailed++
//       metadata.lastProcessedIndex = i
//       metadata.totalProcessed++

//       fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8')
//       fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

//       console.warn(`⚠️ Skip "${headword}": ${err?.message ?? String(err)}`)
//       await new Promise(r => setTimeout(r, 500))
//       continue
//     }

//     if (batchCached >= BATCH_LIMIT) break
//   }

//   metadata.lastUpdated = new Date().toISOString()
//   fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8')
//   fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

//   return {
//     batchCached,
//     isComplete: metadata.lastProcessedIndex + 1 >= records.length,
//     metadata
//   }
// }

// // =======================================================================
// // 🔹 Main function - tự động loop cho đến hết
// // =======================================================================
// export async function cacheWordsFromDictionary(BATCH_LIMIT = 300, AUTO_CONTINUE = true) {
//   console.log(`🌱 Starting word caching process...`)
//   console.log(`📦 Batch size: ${BATCH_LIMIT}`)
//   console.log(`🔄 Auto-continue: ${AUTO_CONTINUE ? 'YES' : 'NO'}`)

//   if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })

//   const csvFile = path.join(__dirname, '../data/words_cefr.csv')
//   if (!fs.existsSync(csvFile)) throw new Error(`❌ CSV file not found: ${csvFile}`)
//   const csvData = fs.readFileSync(csvFile, 'utf-8')
//   const records = parse(csvData, { columns: true, skip_empty_lines: true }) as CsvWordRow[]

//   console.log(`📊 Total words in CSV: ${records.length}\n`)

//   const db = DatabaseService.getInstance()
//   await db.connect()
//   const topicRepo = db.dataSource.getRepository(Topic)
//   const topics = await topicRepo.find({
//     where: {
//       id: Between(56, 83) //27 - 55 //56-83
//     }
//   });
//   if (!topics.length) throw new Error('⚠️ No topics found — seed categories & topics first!')

//   let batchCount = 0

//   // Loop cho đến khi xử lý xong toàn bộ CSV
//   while (true) {
//     batchCount++
//     console.log(`\n${'='.repeat(60)}`)
//     console.log(`🚀 Starting batch #${batchCount}`)
//     console.log('='.repeat(60))

//     const result = await cacheBatch(BATCH_LIMIT, records, topics)

//     console.log(`\n✅ Batch #${batchCount} completed!`)
//     console.log(`📦 This batch: ${result.batchCached} new words`)
//     console.log(`📊 Total progress: ${result.metadata.totalSuccess + result.metadata.totalFailed}/${records.length}`)
//     console.log(`   - Success: ${result.metadata.totalSuccess}`)
//     console.log(`   - Failed: ${result.metadata.totalFailed}`)

//     if (result.isComplete) {
//       console.log(`\n${'🎉'.repeat(20)}`)
//       console.log(`🎉 ALL DONE! Successfully processed entire CSV!`)
//       console.log(`🎉 Total batches: ${batchCount}`)
//       console.log(`🎉 Final stats: ${result.metadata.totalSuccess} success, ${result.metadata.totalFailed} failed`)
//       console.log('🎉'.repeat(20))
//       break
//     }

//     if (!AUTO_CONTINUE) {
//       console.log(`\n⏸️  Auto-continue is OFF. Run again to continue.`)
//       break
//     }

//     // Nghỉ 2 giây giữa các batch để tránh rate-limit
//     console.log(`\n⏳ Waiting 2 seconds before next batch...`)
//     await new Promise(r => setTimeout(r, 2000))
//   }

//   await db.dataSource.destroy()
// }

// // Chạy với AUTO_CONTINUE = true (mặc định)
// cacheWordsFromDictionary(300, true)
