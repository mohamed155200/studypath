// Cloudflare Worker (Workers AI) — وسيط بين StudyPath وموديل مجاني على Cloudflare
// الإعداد: Bindings > Add > Workers AI  (اسم الـ binding: AI)
// اختياري: متغير ALLOWED_ORIGIN = رابط موقعك | متغير MODEL لتغيير الموديل
const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allow = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    if (allow !== '*' && origin !== allow) return new Response('forbidden', { status: 403, headers: cors });
    if (!env.AI) return new Response('AI binding missing', { status: 500, headers: cors });

    let prompt;
    try { ({ prompt } = await req.json()); } catch { return new Response('bad json', { status: 400, headers: cors }); }
    if (typeof prompt !== 'string' || !prompt || prompt.length > 16000) return new Response('bad prompt', { status: 400, headers: cors });

    let res;
    try {
      res = await env.AI.run(env.MODEL || DEFAULT_MODEL, {
        messages: [
          { role: 'system', content: 'You are a helpful study assistant. Reply with a single valid JSON object only. No markdown, no commentary.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500,
      });
    } catch (e) {
      return new Response('ai error', { status: 502, headers: cors });
    }

    let out = res && res.response;
    if (typeof out === 'string') {
      const t = out.replace(/```json|```/g, '').trim();
      try { out = JSON.parse(t); }
      catch { const m = t.match(/\{[\s\S]*\}/); try { out = m ? JSON.parse(m[0]) : null; } catch { out = null; } }
    }
    if (!out || typeof out !== 'object') return new Response('not json', { status: 502, headers: cors });
    return new Response(JSON.stringify(out), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
