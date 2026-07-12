import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = await kv.get('sr-alfredo');
    return res.json(data || { personas: [], prestamos: [] });
  }

  if (req.method === 'PUT') {
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { body = req.body; }
    await kv.set('sr-alfredo', JSON.stringify(body));
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
