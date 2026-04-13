// Kimi API service
// Supports both standard Moonshot API and Kimi Code API endpoints.
// - Moonshot (general purpose): https://api.moonshot.cn/v1  or  https://api.moonshot.ai/v1
// - Kimi Code (coding agents only): https://api.kimi.com/coding/v1
//
// NOTE: This app defaults to the global Moonshot endpoint (api.moonshot.ai) and
// the kimi-k2.5 vision model. Make sure your key has available balance.

const DEFAULT_BASE_URL = 'https://api.moonshot.ai/v1';
const DEFAULT_MODEL = 'kimi-k2.5';
const FALLBACK_MODEL = 'moonshot-v1-128k-vision-preview';

const SYSTEM_PROMPT = `You are a product scanning assistant. Analyze the provided product images and extract as many details as possible.

Return ONLY a valid JSON object with NO markdown formatting, NO code blocks, and NO extra text. Use this exact structure:

{
  "productName": "string or null",
  "brand": "string or null",
  "price": "string or null (include currency if visible)",
  "description": "string or null",
  "expiryDate": "string or null (ISO 8601 if possible, otherwise raw text)",
  "category": "string or null (e.g. food, electronics, cosmetics)",
  "ingredients": "string or null",
  "weightOrVolume": "string or null",
  "countryOfOrigin": "string or null",
  "barcode": "string or null",
  "otherDetails": "string or null (any other visible info)"
}

If a field is not visible or cannot be determined, use null. Do not guess prices or expiry dates unless they are clearly visible in the images.`;

async function callAnalyze(base64Images, apiKey, model, baseUrl) {
  const content = [
    { type: 'text', text: SYSTEM_PROMPT },
    ...base64Images.map((b64) => ({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${b64}`,
      },
    })),
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      temperature: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    // Provide a friendly hint for the common Kimi Code 403 error
    if (response.status === 403 && errorText.includes('Coding Agents')) {
      throw new Error(
        `Kimi Code API restricted (403): This key is only valid for approved coding agents (Claude Code, Roo Code, Kimi CLI, etc.).\n\nFor this mobile app, please use a standard Moonshot API key from https://platform.moonshot.cn/ instead.`
      );
    }
    const err = new Error(`Kimi API error (${response.status}): ${errorText}`);
    err.status = response.status;
    err.type = errorText.includes('engine_overloaded') ? 'engine_overloaded' : 'api_error';
    throw err;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Empty response from Kimi API');
  }

  // Try to parse JSON from the response
  try {
    // Remove possible markdown code blocks
    const cleaned = rawContent
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (parseErr) {
    throw new Error(`Failed to parse JSON from AI response: ${parseErr.message}\n\nRaw response:\n${rawContent}`);
  }
}

export async function analyzeProductImages(
  base64Images,
  apiKey,
  model = DEFAULT_MODEL,
  baseUrl = DEFAULT_BASE_URL
) {
  if (!apiKey) {
    throw new Error('Kimi API key is required');
  }
  if (!base64Images || base64Images.length === 0) {
    throw new Error('At least one image is required');
  }

  try {
    return await callAnalyze(base64Images, apiKey, model, baseUrl);
  } catch (err) {
    if (err.type === 'engine_overloaded' && model !== FALLBACK_MODEL) {
      console.warn(`Model ${model} overloaded. Retrying with fallback ${FALLBACK_MODEL}...`);
      return await callAnalyze(base64Images, apiKey, FALLBACK_MODEL, baseUrl);
    }
    throw err;
  }
}
