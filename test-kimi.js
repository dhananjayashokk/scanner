// Test script for Kimi Code API
// Usage: node test-kimi.js <API_KEY>
// or:    KIMI_API_KEY=sk-... node test-kimi.js

const API_KEY = process.argv[2] || process.env.KIMI_API_KEY;
const BASE_URL = 'https://api.kimi.com/coding/v1';

if (!API_KEY) {
  console.error('Please provide an API key as argument or set KIMI_API_KEY env var');
  process.exit(1);
}

async function testListModels() {
  console.log('1. Testing /v1/models ...');
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('   Models list failed:', res.status, data);
      return false;
    }
    console.log('   Available models:', data.data?.map(m => m.id).join(', '));
    return true;
  } catch (e) {
    console.error('   Error:', e.message);
    return false;
  }
}

async function testChatCompletion(model) {
  console.log(`2. Testing /v1/chat/completions with model "${model}" ...`);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say "Kimi API is working" and nothing else.' }],
        temperature: 0.2,
        max_tokens: 50,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('   Chat completion failed:', res.status, JSON.stringify(data, null, 2));
      return false;
    }
    console.log('   Response:', data.choices?.[0]?.message?.content);
    console.log('   Usage:', JSON.stringify(data.usage));
    return true;
  } catch (e) {
    console.error('   Error:', e.message);
    return false;
  }
}

(async () => {
  console.log('Testing Kimi Code API connectivity...\n');
  const modelsOk = await testListModels();
  
  // Try a few common model names in order of preference
  const candidates = ['kimi-k2-5', 'kimi-k2.5', 'kimi-for-coding', 'kimi-latest'];
  let chatOk = false;
  for (const model of candidates) {
    chatOk = await testChatCompletion(model);
    if (chatOk) break;
  }
  
  console.log('\n' + (modelsOk || chatOk ? '✅ At least one test passed.' : '❌ All tests failed.'));
})();
