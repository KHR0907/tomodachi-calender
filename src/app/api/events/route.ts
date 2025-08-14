import { NextRequest, NextResponse } from 'next/server';
import kv from '@/lib/kv';

const KEY = 'events:v1';

// 저장/전송 형태의 타입
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  userId: string;
  userName: string;
  color: string; // rgba
}

// 생성 시 클라이언트가 보내는 타입
type NewEventPayload = Omit<CalendarEvent, 'id'>;

export async function GET() {
  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body: NewEventPayload = await req.json();
  if (!body.start || !body.end || !body.userId || !body.userName) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  const id = crypto.randomUUID();
  const newEvt: CalendarEvent = { id, ...body };
  events.push(newEvt);
  await kv.set(KEY, events);
  return NextResponse.json(newEvt, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  await kv.set(KEY, events.filter((e) => e.id !== id));
  return NextResponse.json({ ok: true });
}