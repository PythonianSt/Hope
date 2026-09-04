import { NextResponse } from 'next/server';
import { verifyUser } from '../../../lib/auth';
import { readFile } from '../../../lib/github';
import { parseCsv } from '../../../lib/csv';
import { BUCKET_KEYS } from '../../../lib/colors';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const u = searchParams.get('u'); const k = searchParams.get('k'); const bucket = searchParams.get('bucket');
    if (!(await verifyUser(u, k))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (bucket && !BUCKET_KEYS.includes(bucket)) return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    const f = await readFile(`data/users/${u}/memories.csv`);
    const rows = f.exists ? parseCsv(f.content) : [];
    const fullness = {};
    for (const b of BUCKET_KEYS) {
      let weightedWords = 0, weightedEntries = 0;
      for (const r of rows) {
        const w = Number(r[b] || 0) / 100;
        weightedWords += Number(r.word_count || 0) * w;
        weightedEntries += w;
      }
      fullness[b] = Math.min(100, Math.round(Math.max(weightedWords / 4000, weightedEntries / 20) * 100));
    }
    if (!bucket) return NextResponse.json({ fullness });
    const candidates = rows
      .filter(r => Number(r[bucket] || 0) > 0)
      .sort((a,b) => Number(b[bucket]) - Number(a[bucket]));
    const pick = candidates.length ? candidates[Math.floor(Math.random() * Math.min(candidates.length, 5))] : null;
    return NextResponse.json({ fullness, item: pick });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
