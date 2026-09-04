import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { verifyUser } from '../../../lib/auth';
import { appendCsv } from '../../../lib/github';
import { bangkokTimestamp } from '../../../lib/time';

const HEADERS = ['feedback_id','timestamp_bkk','memory_id','bucket','choice'];
export async function POST(req) {
  try {
    const { u, k, memoryId, bucket, choice } = await req.json();
    if (!(await verifyUser(u, k))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['yes','unsure','no'].includes(choice)) return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    await appendCsv(`data/users/${u}/feedback.csv`, HEADERS, {
      feedback_id: crypto.randomUUID(), timestamp_bkk: bangkokTimestamp(), memory_id: memoryId || '', bucket: bucket || '', choice
    }, `Add feedback for ${u}`);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
