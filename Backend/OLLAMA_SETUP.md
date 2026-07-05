# Ollama Setup for AgroPilot

The chatbot now supports Ollama as its primary LLM provider.

## 1. Install Ollama

Download and install Ollama from https://ollama.com/.

## 2. Pull a model

Run:

```bash
ollama pull llama3.1:8b
```

## 3. Start the Ollama service

If needed, start the service locally:

```bash
ollama serve
```

## 4. Configure the backend

The backend reads these settings from environment variables or the existing config defaults:

- CHATBOT_LLM_PROVIDER=ollama
- CHATBOT_OLLAMA_BASE_URL=http://localhost:11434
- CHATBOT_OLLAMA_MODEL=llama3.1:8b
- CHATBOT_LLM_TIMEOUT_SECONDS=20

You can override them in your backend environment before launching the server.

## 5. Run the backend

```bash
cd Backend
uvicorn app.main:app --reload
```

If Ollama is not running, the assistant will automatically fall back to the built-in rule-based response so the app remains usable.
