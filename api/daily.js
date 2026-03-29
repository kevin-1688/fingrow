// api/daily.js
// Save and load daily stats (XP, expense, kcal) for Beat Yesterday system

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

async function supabase(path, method, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SECRET_KEY,
      'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kevin-1688.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // POST — save today's stats (upsert)
    if (req.method === 'POST') {
      const { user_id, date, xp, exp, kcal } = req.body;
      if (!user_id || !date) return res.status(400).json({ error: 'Missing fields' });

      await supabase('/daily_stats', 'POST', {
        user_id, date,
        xp: xp || 0,
        exp: exp || 0,
        kcal: kcal || 0,
      });
      return res.status(200).json({ status: 'saved' });
    }

    // GET — load today + yesterday
    if (req.method === 'GET') {
      const { user_id, today, yesterday } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

      const rows = await supabase(
        `/daily_stats?user_id=eq.${user_id}&date=in.(${today},${yesterday})&select=*`,
        'GET'
      );

      const todayRow = rows?.find(r => r.date === today) || { xp:0, exp:0, kcal:0 };
      const ydayRow  = rows?.find(r => r.date === yesterday) || { xp:0, exp:0, kcal:0 };

      return res.status(200).json({ today: todayRow, yesterday: ydayRow });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('daily error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
