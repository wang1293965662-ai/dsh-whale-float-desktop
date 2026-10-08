#!/usr/bin/env node
/**
 * pet-lite.mjs —— 小鲸鱼后端的「精简自包含版」（127.0.0.1:8902）
 * 只做浮窗真正要的两件事：/balance（余额+峰谷时段）· /pet-art（鲸鱼图）· /health
 * 图：优先用 pet-art.png/jpg（自己的目录、公共区工具目录都能放）→ 没有再退回内置 SVG 小鲸鱼（保证永远有鱼）
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PET_PORT || 8902);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.DSH_HOME || process.cwd();   /* 电脑版：DSH_HOME 由 host 半边注入 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Cache-Control': 'no-store' };

/* 内置小鲸鱼（圆润可爱 · 蓝白 · 永远可用） */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" width="240" height="200">
<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#4c9fe8"/></linearGradient>
<radialGradient id="h" cx="35%" cy="30%" r="60%"><stop offset="0" stop-color="#ffffff" stop-opacity=".85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>
<path d="M40 118c0-38 32-66 78-66 30 0 52 10 66 26 6 6 12 8 20 6-4 10-12 16-24 18 2 6 2 12 0 18-16 26-46 40-80 40-34 0-60-18-60-42z" fill="url(#b)"/>
<path d="M46 128c8 20 32 32 64 32s54-12 66-30c-14 16-40 24-66 24-28 0-52-10-64-26z" fill="#ffffff" opacity=".55"/>
<path d="M186 84c14-14 30-18 44-14-6 6-8 12-6 18 8-2 14-1 20 3-12 8-26 10-40 4-8-3-14-7-18-11z" fill="url(#b)"/>
<circle cx="96" cy="104" r="7" fill="#25324a"/><circle cx="99" cy="101" r="2.4" fill="#fff"/>
<circle cx="140" cy="104" r="7" fill="#25324a"/><circle cx="143" cy="101" r="2.4" fill="#fff"/>
<path d="M108 124c6 6 16 6 22 0" stroke="#25324a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
<circle cx="82" cy="118" r="7" fill="#ffb3c6" opacity=".75"/><circle cx="154" cy="118" r="7" fill="#ffb3c6" opacity=".75"/>
<ellipse cx="120" cy="66" rx="86" ry="52" fill="url(#h)"/>
<path d="M120 34c6-12 18-18 30-16-6 6-8 12-6 18 6-4 14-4 20 0-10 10-26 12-44-2z" fill="#bfe6ff" opacity=".9"/>
</svg>`;

function apiKey() {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY.trim();
  for (const f of [path.join(HOME, '.credentials.yaml'), '/data/user/0/com.deepseek.harness.beta/files/payload/dshhome/.credentials.yaml']) {
    try { const m = fs.readFileSync(f, 'utf8').match(/DEEPSEEK_API_KEY:\s*(\S+)/); if (m) return m[1].replace(/^["']|["']$/g, ''); } catch (e) {}
  }
  return '';
}
function peakNow() {
  const d = new Date(Date.now() + 8 * 3600e3), w = d.getUTCDay(), h = d.getUTCHours();
  const peak = w >= 1 && w <= 5 && ((h >= 9 && h < 12) || (h >= 14 && h < 18));
  const since = new Date(); since.setHours(peak ? 9 : 18, 0, 0, 0);
  const until = new Date(); until.setHours(peak ? 12 : (h < 9 ? 9 : 9), 0, 0, 0);
  if (!peak && h >= 18) until.setDate(until.getDate() + 1);
  if (!peak && h >= 12 && h < 14) until.setHours(14, 0, 0, 0);
  return { offPeak: !peak, label: peak ? '高峰' : '空闲', since: since.toISOString(), until: until.toISOString() };
}
function readArt() {
  const cands = [path.join(HERE, 'pet-art.png'), path.join(HERE, 'pet-art.jpg'), '/sdcard/工作区★公共/工具/pet-art.png', '/sdcard/工作区★公共/工具/pet-art.jpg', path.join(HERE, 'pet-art.svg')];
  for (const c of cands) { try { const b = fs.readFileSync(c); return { b, type: /\.png$/.test(c) ? 'image/png' : /\.jpg$/.test(c) ? 'image/jpeg' : 'image/svg+xml' }; } catch (e) {} }
  return { b: Buffer.from(SVG), type: 'image/svg+xml' };
}
async function balance() {
  const key = apiKey();
  if (!key) return { ok: false, error: '没有 DEEPSEEK_API_KEY', peak: peakNow() };
  try {
    const r = await fetch('https://api.deepseek.com/user/balance', { headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' } });
    const j = await r.json();
    const cny = (j.balance_infos || []).find((b) => b.currency === 'CNY') || (j.balance_infos || [])[0] || {};
    return { ok: true, available: !!j.is_available, total: parseFloat(cny.total_balance || '0'), topped: parseFloat(cny.topped_up_balance || '0'), granted: parseFloat(cny.granted_balance || '0'), currency: cny.currency || 'CNY', peak: peakNow() };
  } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 80), peak: peakNow() }; }
}
const srv = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const json = (o, code = 200) => { const b = Buffer.from(JSON.stringify(o)); res.writeHead(code, { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': b.length }); res.end(b); };
  if (u.pathname === '/health') return json({ ok: true, pid: process.pid, art: readArt().type });
  if (u.pathname === '/pet-art') { const a = readArt(); res.writeHead(200, { ...CORS, 'Content-Type': a.type, 'Content-Length': a.b.length }); return res.end(a.b); }
  if (u.pathname === '/balance') return json(await balance());
  res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' });
  return res.end('<meta charset="utf-8"><body style="font:16px/1.7 -apple-system,sans-serif;padding:24px">🐋 小鲸鱼后端在跑<br>/balance · /pet-art · /health</body>');
});
srv.on('error', (e) => { if (e && e.code === 'EADDRINUSE') { console.log('8902 已被占用，退出'); process.exit(0); } console.log('出错: ' + e.message); process.exit(1); });
srv.listen(PORT, '127.0.0.1', () => console.log('🐋 pet-lite: http://127.0.0.1:' + PORT + '  (图: ' + readArt().type + ')'));
