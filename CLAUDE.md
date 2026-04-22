# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start the Expo dev server (scan QR with Expo Go app)
npx expo start

# Run on specific platform
npx expo start --android
npx expo start --ios
npx expo start --web
```

There are no tests in this project.

## Architecture

This is a single-screen React Native (Expo) app. All UI lives in `App.js` (one large component). The only non-UI code is `src/api/kimiApi.js`.

**Data flow:**
1. User captures images via `expo-camera` (`CameraView`) or selects from gallery via `expo-image-picker` — stored as base64 strings in `images` state array (max 3).
2. On "Analyze", `analyzeProductImages()` in `kimiApi.js` sends the base64 images to the Moonshot AI API as OpenAI-compatible vision messages.
3. The API returns a JSON object with product fields; the result is rendered as key-value cards plus raw JSON.

**API layer (`src/api/kimiApi.js`):**
- Default model: `kimi-k2.5` at `https://api.moonshot.ai/v1`
- Fallback model: `moonshot-v1-128k-vision-preview` (used automatically if the primary returns `engine_overloaded`)
- The system prompt instructs the model to return a strict JSON structure with 11 product fields
- Response parsing strips markdown code fences before `JSON.parse`

**API key:** The app has a hardcoded `DEFAULT_API_KEY` in `App.js:20` used when the user leaves the key field empty. The `.env.example` shows `KIMI_API_KEY` but the app does not actually read from `.env` — it uses the hardcoded value as a fallback.

**Important API note:** Standard Moonshot API keys (from `platform.moonshot.cn`) work. Kimi Code keys (from `kimi.com/code/console`) return 403 and are restricted to approved coding agents.
