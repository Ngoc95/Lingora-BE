## Chatbot Module Overview

This guide explains how the backend AI chat module works so the frontend can integrate without calling the FastAPI service directly.

### Architecture

- **Frontend → Node/Express (`lingora-be`)**: All chat requests go through the existing backend.
- **Node/Express → AI Service**: Backend proxies requests to the FastAPI `ai-service`, passing the user question, optional `sessionId`, and the last 10 stored messages so the agent has full context.
- **Persistence**: Chat sessions and messages are stored in PostgreSQL (`chat_sessions`, `chat_messages`) via TypeORM. `userId` can be null for anonymous chats.
- **Session titles**: The backend asks the AI service (`POST /generate-title`) to summarize the first question into a short title. If that fails, it falls back to a trimmed version of the question.

### Environment Variables

```
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT_MS=15000
```

Set these in `.env` so the backend knows where to forward chat requests.

### REST Endpoints

All routes are mounted under `/chat`.

#### POST `/chat`

- **Purpose**: Send a question and receive the AI response. Automatically creates a session if none exists.
- **Headers**:
  - Optional: `Authorization: Bearer <ACCESS_TOKEN>` (include when user is logged in so history is tied to their account)
  - Required: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "question": "Giải thích thì hiện tại hoàn thành?",
    "sessionId": "UUID | optional"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Chat response generated",
    "statusCode": 200,
    "metaData": {
      "session": {
        "id": "UUID",
        "title": "Giải thích thì hiện tại hoàn thành?",
        "userId": 12,
        "createdAt": "...",
        "updatedAt": "..."
      },
      "answer": "AI trả lời ...",
      "messages": [
        {
          "id": "UUID",
          "content": "Giải thích thì hiện tại hoàn thành?",
          "sender": "USER",
          "createdAt": "..."
        },
        {
          "id": "UUID",
          "content": "AI trả lời ...",
          "sender": "AI",
          "createdAt": "..."
        }
      ]
    }
  }
  ```
- The latest AI reply is always the last item in `messages`.

#### GET `/chat/sessions`

- **Requires**: `Authorization` header (only returns sessions owned by the logged-in user).
- **Response**:
  ```json
  {
    "message": "Get chat sessions successfully",
    "metaData": {
      "sessions": [
        {
          "id": "UUID",
          "title": "Thì hiện tại đơn dùng khi nào?",
          "userId": 12,
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  }
  ```

#### GET `/chat/sessions/:sessionId/messages`

- **Headers**:
  - Optional `Authorization`. If the session belongs to a user, they must be authenticated; otherwise anonymous sessions can be read without a token.
- **Response**:
  ```json
  {
    "message": "Get chat messages successfully",
    "metaData": {
      "session": { ... },
      "messages": [
        { "id": "UUID", "content": "Question", "sender": "USER", "createdAt": "..." },
        { "id": "UUID", "content": "Answer", "sender": "AI", "createdAt": "..." }
      ]
    }
  }
  ```

#### DELETE `/chat/sessions/:sessionId`

- **Requires**: `Authorization` header (only the session owner can delete it).
- **Response**:
  ```json
  {
    "message": "Chat session deleted",
    "metaData": {
      "sessionId": "UUID"
    }
  }
  ```
- `chat_messages` are removed automatically via cascade.

### Frontend Integration Flow

1. **Anonymous chat**: Call `POST /chat` without an `Authorization` header. The backend keeps `userId = null`. Store `sessionId` from the response to continue the conversation client-side (e.g., in local storage).
2. **Authenticated chat**:
   - Include `Authorization` header so sessions/messages are tied to the user.
   - Use `GET /chat/sessions` to show past conversations after the user logs back in.
   - Use `GET /chat/sessions/:sessionId/messages` to load message history when opening a session.
3. **Displaying responses**: Use the appended `messages` array to render the conversation. The backend already includes the user question that triggered the request plus the AI response, so no extra merge logic is needed.

### Error Handling

- Validation errors return a 400 with a single `message`.
- Invalid/expired tokens return 401 via `AuthRequestError`.
- Trying to access another user’s session returns 403.
- AI service issues bubble up as `BadRequestError` with the message `AI service error: ...`.

### Notes

- The backend sends the last 10 messages to the FastAPI agent each time, so the frontend doesn’t need to maintain its own context when calling `/chat`.
- If you want to “reset” a conversation, drop the `sessionId` so a new session is created.
- Rate limiting or typing indicators aren’t implemented yet; add them at the frontend layer if needed.
