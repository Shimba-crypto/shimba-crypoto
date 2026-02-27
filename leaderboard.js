// functions/api/leaderboard.js

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { name, points } = body;

  if (!name || typeof points !== 'number' || points < 0) {
    return new Response(JSON.stringify({ error: 'Invalid name or points' }), { status: 400 });
  }

  const db = env.quiz_scores;   // ← your D1 binding name (from wrangler.toml)

  try {
    await db.prepare(`
      INSERT INTO leaderboard (name, points, last_updated)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(name) DO UPDATE SET
        points = excluded.points,
        last_updated = excluded.last_updated
    `)
      .bind(name.trim(), points)
      .run();

    return new Response(JSON.stringify({ success: true }));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  const db = env.quiz_scores;

  try {
    const { results } = await db.prepare(`
      SELECT name, points, last_updated
      FROM leaderboard
      ORDER BY points DESC
      LIMIT 20
    `).all();

    return new Response(JSON.stringify(results || []));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), { status: 500 });
  }
}