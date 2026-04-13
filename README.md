# Product Scanner

A React Native (Expo) app that uses your camera to scan products and sends 1–3 images to the **Kimi K2.5** AI model (via Moonshot AI API) to extract details like price, product name, description, expiry date, and more — returned as clean JSON.

---

## Features

- **Camera capture** – take up to 3 photos of any product
- **Gallery picker** – choose images from your phone's gallery
- **AI analysis** – sends images to Kimi K2.5 vision model
- **JSON results** – extracts structured data:
  - `productName`
  - `brand`
  - `price`
  - `description`
  - `expiryDate`
  - `category`
  - `ingredients`
  - `weightOrVolume`
  - `countryOfOrigin`
  - `barcode`
  - `otherDetails`
- **In-app result display** – both formatted cards and raw JSON

---

## Project Structure

```
ProductScanner/
├── App.js                 # Main UI (camera, inputs, results)
├── src/
│   └── api/
│       └── kimiApi.js     # Kimi API service
├── app.json               # Expo config with camera permissions
├── package.json
└── assets/
```

---

## Setup

### 1. Install dependencies

```bash
cd ProductScanner
npm install
```

### 2. Get a Kimi API Key

You need a **standard Moonshot API key** (not a Kimi Code key).

- Go to [https://platform.moonshot.cn/](https://platform.moonshot.cn/) and create a key.
- **Note:** Keys from [https://www.kimi.com/code/console](https://www.kimi.com/code/console) (Kimi Code) are restricted to approved coding agents such as Claude Code, Roo Code, and Kimi CLI. They will return a `403` error in this mobile app. For product scanning, use a regular Moonshot API key.

### 3. Run the app

```bash
npx expo start
```

Then scan the QR code with the **Expo Go** app (iOS/Android) or press `a` for Android emulator / `i` for iOS simulator.

> **Note:** Camera features require a real device (emulators/simulators have limited camera support).

---

## How to Use

1. **Enter your API key** in the input field at the top of the app.
2. Tap **"Open Camera"** and take 1–3 photos of the product (front, back, ingredients label, etc.).
3. Or tap **"Pick from Gallery"** to select existing photos.
4. Tap **"Analyze with Kimi K2.5"**.
5. Wait a few seconds for the AI to process the images.
6. View the extracted product details and raw JSON.

---

## API Details

- **Base URL:** `https://api.moonshot.cn/v1/chat/completions`
- **Model:** `kimi-k2-5` (configurable in `src/api/kimiApi.js`)
- **Images:** sent as base64 data URLs inside the chat messages payload (OpenAI-compatible vision format)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Camera Permission Required" | Grant camera permission in your device settings or tap the permission button. |
| "Kimi API error (401)" | Your API key is invalid or expired. Double-check it on the Moonshot dashboard. |
| "Failed to parse JSON" | The model occasionally returns extra text. The app tries to clean markdown code blocks, but if it persists, try retaking clearer images. |
| Images look blurry | Make sure you have good lighting and hold the camera steady. |

---

## Customization

- Change the model in `src/api/kimiApi.js`:
  ```js
  const DEFAULT_MODEL = 'kimi-k2-5';
  ```
- Adjust the system prompt in `src/api/kimiApi.js` to extract different fields or change the output language.
