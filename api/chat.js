export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in environment variables' });

  try {
    const { messages, system, model, vision } = req.body;

    // Pick model: vision scan uses gemini (free vision support), chat uses llama
    const chosenModel = model || (vision ? 'google/gemini-2.0-flash-exp:free' : 'meta-llama/llama-3.3-70b-instruct:free');

    const payload = {
      model: chosenModel,
      max_tokens: 1500,
      temperature: 0.7,
      messages: system
        ? [{ role: 'system', content: system }, ...messages]
        : messages
    };

    const or = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aria-v2-one.vercel.app',
        'X-Title': 'ARIA Assistant'
      },
      body: JSON.stringify(payload)
    });

    const data = await or.json();

    if (!or.ok || data.error) {
      // fallback to gemini if llama quota hit
      if (!vision) {
        const fb = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://aria-v2-one.vercel.app',
            'X-Title': 'ARIA Assistant'
          },
          body: JSON.stringify({ ...payload, model: 'google/gemini-2.0-flash-exp:free' })
        });
        const fbData = await fb.json();
        return res.status(200).json({ reply: fbData.choices?.[0]?.message?.content || 'No response from AI.' });
      }
      return res.status(200).json({ reply: data.error?.message || 'AI error.' });
    }

    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || 'No response.' });

  } catch (err) {
    console.error('API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
