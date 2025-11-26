import { checkSchema } from "express-validator";
import { isLength, isRequired, isString } from "../common.middlewares";
import { validate } from "../validation.middlewares";

export const sendChatMessageValidation = validate(
  checkSchema({
    question: {
      ...isRequired("question"),
      ...isString("question"),
      trim: true,
      ...isLength({ fieldName: "question", min: 1, max: 2000 }),
    },
    sessionId: {
      optional: true,
      isUUID: {
        options: 4,
        errorMessage: "sessionId must be a valid UUID v4",
      },
    },
  })
);
