export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { messages, system } = req.body;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aria-assistant.vercel.app',
        'X-Title': 'ARIA Smart Assistant'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'system', content: system },
          ...messages
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      // Fallback to Gemini if Llama fails
      const fallback = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aria-assistant.vercel.app',
          'X-Title': 'ARIA Smart Assistant'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            { role: 'system', content: system },
            ...messages
          ],
          max_tokens: 1024,
          temperature: 0.7
        })
      });
      const fallbackData = await fallback.json();
      return res.status(200).json({ reply: fallbackData.choices?.[0]?.message?.content || 'No response.' });
    }

    const data = await response.json();
    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || 'No response.' });

  } catch (err) {
    console.error('OpenRouter error:', err);
    return res.status(500).json({ error: 'Failed to get response from AI.' });
  }
}
