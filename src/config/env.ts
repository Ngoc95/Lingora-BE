import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Server settings
  PORT: process.env.PORT || 4000,

  // Database settings
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASS: process.env.DB_PASS || "",
  DB_NAME: process.env.DB_NAME || "lingora",

  // Cloudinary settings
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",

  // JWT settings
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "access_secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  JWT_ACCESS_EXPIRE_TIME: process.env.JWT_ACCESS_EXPIRE_TIME || "15m",
  JWT_REFRESH_EXPIRE_TIME: process.env.JWT_REFRESH_EXPIRE_TIME || "7d",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:8000",
  AI_SERVICE_TIMEOUT_MS: Number(process.env.AI_SERVICE_TIMEOUT_MS) || 15000,

  // Dictionary settings
  DICTIONARY_API_BASE_URL:
    process.env.DICTIONARY_API_BASE_URL ||
    "https://api.dictionaryapi.dev/api/v2/entries",
  DICTIONARY_API_LANGUAGE: process.env.DICTIONARY_API_LANGUAGE || "en",
  DICTIONARY_TIMEOUT_MS: Number(process.env.DICTIONARY_TIMEOUT_MS) || 8000,
  DICTIONARY_DEFAULT_CEFR_LEVEL:
    process.env.DICTIONARY_DEFAULT_CEFR_LEVEL || "A1",

  // Translation settings
  TRANSLATE_PROVIDER: process.env.TRANSLATE_PROVIDER || "auto",
  LIBRETRANSLATE_API_URL: process.env.LIBRETRANSLATE_API_URL || "",
  MYMEMORY_API_URL: process.env.MYMEMORY_API_URL || "",
};
