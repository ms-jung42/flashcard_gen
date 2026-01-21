# AI Flashcard Generator 📚

A powerful web application that generates study flashcards from PDF documents using AI.

## Features ✨

*   **Smart PDF Viewer:** Virtualized rendering for performance, "last viewed page" memory, and auto-zoom.
*   **AI Generation:** Extract concepts and create flashcards automatically using:
    *   **Google Gemini** (Recommended for speed/cost)
    *   **OpenAI GPT-4o**
    *   **Local LLMs** (via OpenAI-compatible endpoints like Ollama)
    *   **Anthropic Claude** (⚠️ *Implementation present but currently untested*)
*   **Persistence:** All your PDFs, cards, and settings are saved automatically to your browser (IndexedDB).
*   **Flashcard Editor:** Markdown-supported editor with preview and cloze deletion support.
*   **Privacy First:** Your PDFs are stored locally in your browser, not uploaded to a central server (except for the snippets sent to the AI API for generation).

## Technology Stack 🛠️

*   **Frontend:** React, Vite
*   **State Management:** Zustand
*   **Styling:** Tailwind CSS, Framer Motion
*   **PDF Engine:** react-pdf (PDF.js)
*   **LLM Integration:** @google/genai, @anthropic-ai/sdk, OpenAI API

## Deployment

This project is configured to deploy automatically to **GitHub Pages** using GitHub Actions.
Pushing to the `main` branch triggers a build and deploy.

## Known Issues / Status

*   **Claude Integration:** The code includes support for Anthropic's Claude API, but this specific feature has not been fully verified in the current release. Use with caution.
