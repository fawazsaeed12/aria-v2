export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Key: env var preferred, hardcoded fallback so it works without manual setup
  const apiKey = process.env.OPENROUTER_API_KEY || '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';

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { messages, system, vision } = body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Vision (timetable scan) uses Gemini — only free model with image support
  // Chat uses Llama 3.3 70B with Gemini fallback
  const primaryModel = vision
    ? 'google/gemini-2.0-flash-exp:free'
    : 'meta-llama/llama-3.3-70b-instruct:free';
  const fallbackModel = 'google/gemini-2.0-flash-exp:free';

  const builtMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  const callOR = async (model) => {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aria-v2-rose.vercel.app',
        'X-Title': 'ARIA Assistant'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        temperature: 0.7,
        messages: builtMessages
      })
    });
    const data = await r.json();
    return { ok: r.ok, data };
  };

  try {
    let { ok, data } = await callOR(primaryModel);

    // Fallback if primary fails
    if (!ok || data.error) {
      console.log(`Primary model ${primaryModel} failed, trying fallback`);
      ({ ok, data } = await callOR(fallbackModel));
    }

    if (data.error) {
      console.error('OpenRouter error:', JSON.stringify(data.error));
      return res.status(200).json({ error: `AI error: ${data.error.message || JSON.stringify(data.error)}` });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      console.error('Empty response:', JSON.stringify(data).slice(0, 300));
      return res.status(200).json({ error: 'AI returned empty response. Try again.' });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
