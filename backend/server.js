require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// --- Supabase Client ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

// --- Healthcheck ---
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'verdica-backend', time: new Date().toISOString() });
});

// ========================= USERS =========================
app.get('/api/users', async (_req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, users: data });
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ ok: false, error: 'username required' });

  const { data, error } = await supabase.from('users').insert([{ username }]).select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, user: data[0] });
});

// ========================= POSTS =========================
app.get('/api/posts', async (_req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content, likes, accusations, created_at, user_id, users(username)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, posts: data });
});

app.post('/api/posts', async (req, res) => {
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ ok: false, error: 'user_id and content required' });

  const { data, error } = await supabase.from('posts').insert([{ user_id, content }]).select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, post: data[0] });
});

app.post('/api/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { data: post, error: getErr } = await supabase.from('posts').select('likes').eq('id', id).single();
  if (getErr) return res.status(500).json({ ok: false, error: getErr.message });
  const newLikes = (post?.likes || 0) + 1;

  const { data, error } = await supabase.from('posts').update({ likes: newLikes }).eq('id', id).select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, post: data[0] });
});

app.post('/api/posts/:id/accuse', async (req, res) => {
  const { id } = req.params;
  const { data: post, error: getErr } = await supabase.from('posts').select('accusations').eq('id', id).single();
  if (getErr) return res.status(500).json({ ok: false, error: getErr.message });
  const newAccusations = (post?.accusations || 0) + 1;

  const { data, error } = await supabase.from('posts').update({ accusations: newAccusations }).eq('id', id).select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, post: data[0] });
});

// ========================= TRIALS =========================
app.get('/api/trials', async (_req, res) => {
  const { data, error } = await supabase
    .from('trials')
    .select('id, status, created_at, post_id, accused_id, posts(content), users(username)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, trials: data });
});

app.get('/api/trials/:id/judges', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('trial_judges')
    .select('user_id, users(username)')
    .eq('trial_id', id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, judges: data });
});

app.get('/api/trials/:id/results', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('trial_votes').select('*').eq('trial_id', id);
  if (error) return res.status(500).json({ ok: false, error: error.message });

  const tally = { guilty: 0, not_guilty: 0 };
  for (const v of data) tally[v.vote]++;

  res.json({ ok: true, votes: data, tally });
});

app.post('/api/trials/check', async (_req, res) => {
  const { data: posts, error: postsErr } = await supabase.from('posts').select('*');
  if (postsErr) return res.status(500).json({ ok: false, error: postsErr.message });

  const newTrials = [];

  for (const post of posts) {
    if (post.accusations >= post.likes) {
      const { data: existing } = await supabase.from('trials').select('*').eq('post_id', post.id).maybeSingle();
      if (!existing) {
        const { data: trialData, error: trialError } = await supabase
          .from('trials')
          .insert([{ post_id: post.id, accused_id: post.user_id }])
          .select();
        if (trialError) return res.status(500).json({ ok: false, error: trialError.message });

        const trial = trialData[0];

        const { data: allUsers, error: uErr } = await supabase.from('users').select('id');
        if (uErr) return res.status(500).json({ ok: false, error: uErr.message });

        const pool = (allUsers || []).filter((u) => u.id !== trial.accused_id);

        if (pool.length > 0) {
          const shuffled = [...pool].sort(() => 0.5 - Math.random());
          const judges = shuffled.slice(0, Math.min(3, shuffled.length));
          if (judges.length > 0) {
            const inserts = judges.map((u) => ({ trial_id: trial.id, user_id: u.id }));
            const { error: jErr } = await supabase.from('trial_judges').insert(inserts);
            if (jErr) return res.status(500).json({ ok: false, error: jErr.message });
          }
        }

        newTrials.push(trial);
      }
    }
  }

  res.json({ ok: true, created: newTrials.length, trials: newTrials });
});

// ========================= VOTING =========================
app.post('/api/trials/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { user_id, role, vote } = req.body;
  if (!user_id || !role || !vote) {
    return res.status(400).json({ ok: false, error: 'user_id, role and vote required' });
  }

  // Check role validity
  const { data: judges } = await supabase.from('trial_judges').select('user_id').eq('trial_id', id);
  const { data: trial } = await supabase.from('trials').select('accused_id').eq('id', id).single();

  if (role === 'judge' && !judges.find((j) => j.user_id === user_id)) {
    return res.status(400).json({ ok: false, error: 'Dieser User ist kein Judge in diesem Trial' });
  }

  if (role === 'audience') {
    if (judges.find((j) => j.user_id === user_id)) {
      return res.status(400).json({ ok: false, error: 'Ein Judge kann nicht als Audience abstimmen' });
    }
    if (trial && trial.accused_id === user_id) {
      return res.status(400).json({ ok: false, error: 'Der Angeklagte kann nicht abstimmen' });
    }
  }

  // Vote insert/update (kein Duplicate mehr)
  const { data: existing, error: exErr } = await supabase
    .from('trial_votes')
    .select('*')
    .eq('trial_id', id)
    .eq('user_id', user_id)
    .maybeSingle();
  if (exErr) return res.status(500).json({ ok: false, error: exErr.message });

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('trial_votes')
      .update({ role, vote })
      .eq('id', existing.id)
      .select();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    result = data[0];
  } else {
    const { data, error } = await supabase
      .from('trial_votes')
      .insert([{ trial_id: id, user_id, role, vote }])
      .select();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    result = data[0];
  }

  res.json({ ok: true, vote: result });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Verdica backend läuft auf http://localhost:${PORT}`));
