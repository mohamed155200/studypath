// Cloudflare Worker: وسيط آمن بين StudyPath و Anthropic API
// الإعداد: أضف Secret باسم ANTHROPIC_API_KEY (وممكن Variable باسم ALLOWED_ORIGIN = رابط موقعك)
const MODEL = 'claude-sonnet-5-5';

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allow = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': allow === '*' ? '*' : allow,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    if (allow !== '*' && origin !== allow) return new Response('forbidden', { status: 403, headers: cors });

    let prompt;
    try { ({ prompt } = await req.json()); } catch { return new Response('bad json', { status: 400, headers: cors }); }
    if (typeof prompt !== 'string' || !prompt || prompt.length > 20000) return new Response('bad prompt', { status: 400, headers: cors });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: 'Reply with a single valid JSON value only. No markdown fences, no commentary.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) return new Response('upstream ' + r.status, { status: 502, headers: cors });
    const d = await r.json();
    const text = (d.content || []).map((b) => b.text || '').join('').replace(/```json|```/g, '').trim();
    let out;
    try { out = JSON.parse(text); } catch { return new Response('not json', { status: 502, headers: cors }); }
    return new Response(JSON.stringify(out), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
