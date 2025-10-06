/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: README.md; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\README.md; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

# Agent Lee Multi-Tool

A versatile web application that bundles Text Generation, Image Generation, Chat, Media Analysis, and Web Research capabilities into a single, intuitive interface using the Gemini API. This project showcases an advanced AI agent, "Agent Lee," capable of understanding complex prompts, utilizing a suite of tools autonomously, and maintaining a consistent persona.

## ✨ Features

- **Multi-Modal Capabilities**: Interact with text, generate images, analyze media files (images, video, audio), and parse documents (PDF, DOCX, etc.).
- **Autonomous Agent**: Agent Lee can understand multi-step commands, navigate the app's UI, and use the appropriate tool to complete a task.
- **Conversational AI**: Engage in natural, voice-activated conversations. The agent maintains context and can access "memories" from past interactions.
- **Character Studio**: Create and manage consistent characters for use in story generation and image creation, ensuring visual and personality continuity.
- **Web Research**: Ground responses in up-to-date information from the web using Google Search integration.
- **Integrated Notepad ("The Vault")**: Save, organize, and analyze generated content, conversation logs, and research findings.
- **Communications Hub**: Transcribe voice calls, draft emails/SMS, and manage contacts.
- **Customizable Persona**: Agent Lee's persona, ethics, and knowledge base are defined in a centralized configuration, making it easily adaptable.
- **Voice-First Interface**: Features "always-on" listening, speech-to-text, and high-quality, configurable text-to-speech for a hands-free experience.

## 🚀 Setup & Deployment

This application is designed to be deployed as a static website, for example, on GitHub Pages.

### Prerequisites

You need a Google Gemini API key to use this application.

1.  Obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  This key is provided to the application via the `process.env.API_KEY` environment variable.

### GitHub Pages Deployment

This repository includes a GitHub Actions workflow (`.github/workflows/main.yml`) that automatically deploys the application to GitHub Pages on every push to the `main` branch.

To make the deployment work, you must configure the Gemini API key as a repository secret:

1.  In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2.  Click **New repository secret**.
3.  Name the secret `API_KEY`.
4.  Paste your Gemini API key into the "Value" field.
5.  Click **Add secret**.

The workflow will use this secret to power the application. No code changes are needed.

## 🔧 Local Development

While designed for direct deployment, you can run this project locally using a simple web server that can serve static files.

1.  Clone the repository.
2.  Use a tool like `live-server` (or any static file server) to serve the `index.html` file. Note: The `process.env.API_KEY` mechanism is designed for a build/deployment environment. For local development, you will need to adapt the code to read the key from a different source or use a simple build tool like Vite that supports environment variables.
