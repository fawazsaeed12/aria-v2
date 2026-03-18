export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

  // Vision (timetable scan) needs a model with image support
  // mistral-small-3.1 is free AND supports vision
  // For chat: llama 3.3 70B is best free text model
  // openrouter/free is the auto-router fallback — always works
  const models = vision
    ? ['mistralai/mistral-small-3.1-24b-instruct:free', 'google/gemma-3-27b-it:free', 'openrouter/free']
    : ['meta-llama/llama-3.3-70b-instruct:free', 'mistralai/mistral-small-3.1-24b-instruct:free', 'openrouter/free'];

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
    // Try each model in order until one works
    for (const model of models) {
      const { ok, data } = await callOR(model);
      if (ok && !data.error && data.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: data.choices[0].message.content });
      }
      console.log(`Model ${model} failed:`, data.error?.message || 'no content');
    }
    return res.status(200).json({ error: 'All AI models are currently unavailable. Please try again in a moment.' });
  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
