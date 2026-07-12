import { kv } from '@vercel/kv';

const KEY = 'sr-alfredo-v2';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    let data = await kv.get(KEY);
    if (!data) {
      data = { version: 2, clients: [], loans: [], payments: [], config: { darkMode: false } };
      await kv.set(KEY, JSON.stringify(data));
    }
    return res.json(data);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { body = req.body; }
    body.version = 2;
    await kv.set(KEY, JSON.stringify(body));
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
