const key = 'sk-RP4MCNqAf9zvWJBoPyktFmmVVZhcPRjKbeAFffOVm1ROgDjG';
const BASE_URL = 'https://api.moonshot.ai/v1';

// Models to test in order of preference
const MODELS = ['kimi-k2.5', 'kimi-k2-0905-preview', 'kimi-k2-turbo-preview', 'moonshot-v1-128k-vision-preview'];

async function testModels() {
  console.log('1. Testing /v1/models ...');
  const res = await fetch(`${BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Models:', data.data?.map(m => m.id).join(', '));
  return res.ok;
}

async function testChat(model) {
  console.log(`2. Testing /v1/chat/completions with model "${model}" ...`);
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Say "Kimi API is working" and nothing else.' }],
      temperature: 1,
      max_tokens: 50,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Chat failed:', res.status, JSON.stringify(data, null, 2));
    return false;
  }
  console.log('Response:', data.choices?.[0]?.message?.content);
  console.log('Usage:', JSON.stringify(data.usage));
  return true;
}

async function testVision(model) {
  console.log(`3. Testing vision with model "${model}" ...`);
  const redPixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What color is this image? Reply with one word.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${redPixelPng}` } },
          ],
        },
      ],
      temperature: 1,
      max_tokens: 50,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Vision failed:', res.status, JSON.stringify(data, null, 2));
    return false;
  }
  console.log('Vision Response:', data.choices?.[0]?.message?.content);
  console.log('Usage:', JSON.stringify(data.usage));
  return true;
}

(async () => {
  try {
    await testModels();
    let chatOk = false;
    let visionOk = false;
    let workingModel = null;

    for (const model of MODELS) {
      if (!chatOk) chatOk = await testChat(model);
      if (!visionOk) visionOk = await testVision(model);
      if (chatOk && visionOk) {
        workingModel = model;
        break;
      }
    }

    if (workingModel) {
      console.log(`\n✅ Chat + Vision working with model: ${workingModel}`);
    } else {
      console.log('\n❌ All tested models failed.');
    }
  } catch (e) {
    console.error('\n❌ Error:', e.message);
  }
})();
