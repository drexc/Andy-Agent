# Andy Agent - OpenAI-Compatible API Bridge

The **Andy Agent OpenAI Bridge** allows any IDE (VS Code, Cursor, Windsurf, JetBrains) or CLI tool (Cline, Continue.dev, Roo Code, Aider, OpenCode) to interact directly with **Andy Agent's Recursive Language Model (RLM)** and persistent IPython kernel using the standard OpenAI `/v1/chat/completions` and `/v1/models` protocol.

---

## Features

- **Standard OpenAI Endpoints**:
  - `GET /v1/models`: Lists all models registered in Andy Agent (Omniroute, Anthropic, Gemini, OpenAI, etc.).
  - `POST /v1/chat/completions`: Full support for Server-Sent Events (SSE) streaming (`stream: true`) and standard JSON responses.
  - `POST /v1/sessions/reset`: Reset conversation state for a session.
- **RLM Code Execution Visibility**: Displays Python kernel code executions and output in the chat stream.
- **Session Pooling**: Maintains session memory by session ID (`x-session-id` header or `user` field) or ephemeral mode.
- **Multi-Client / IDE Compatibility**: Connect multiple IDEs, editors, or terminals simultaneously.

---

## Starting the Server

```bash
# Start on port 3000 (default: Omniroute provider)
npx tsx packages/openai-bridge/src/cli.ts --port 3000

# Start with verbose logging and custom model
npx tsx packages/openai-bridge/src/cli.ts --port 3000 --provider omniroute --model auto/best-coding --verbose
```

---

## IDE Integration Guides

### 1. Continue.dev (VS Code / JetBrains)

Add the following to your `~/.continue/config.json` (or click *Add Model* -> *Custom OpenAI* in Continue):

```json
{
  "models": [
    {
      "title": "Andy Agent (RLM)",
      "provider": "openai",
      "model": "auto/best-coding",
      "apiBase": "http://localhost:3000/v1",
      "apiKey": "dummy-key"
    }
  ]
}
```

---

### 2. Cline / Roo Code (VS Code Extension)

1. Open **Cline** / **Roo Code** settings.
2. In **API Provider**, select **OpenAI Compatible**.
3. Set **Base URL**: `http://localhost:3000/v1`
4. Set **API Key**: `dummy-key` (or any string)
5. Set **Model ID**: `auto/best-coding` (or any model from `/v1/models`)

---

### 3. Cursor IDE

1. Open Cursor Settings -> **Models** -> **OpenAI API Key**.
2. Override the base URL to `http://localhost:3000/v1`.
3. Add model name `auto/best-coding`.

---

### 4. Aider / OpenCode (CLI)

```bash
export OPENAI_API_BASE="http://localhost:3000/v1"
export OPENAI_API_KEY="dummy-key"

aider --model openai/auto/best-coding
```

---

### 5. Direct cURL Example

```bash
# Test streaming completion
curl -N http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto/best-fast",
    "stream": true,
    "messages": [
      { "role": "user", "content": "Calcula la suma de los primeros 100 números primos usando Python." }
    ]
  }'
```
