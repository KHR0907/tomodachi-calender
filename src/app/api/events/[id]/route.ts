// ❌ 제거: import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import kv from '@/lib/kv';

const KEY = 'events:v1';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  userId: string;
  userName: string;
  color: string;
  allDay?: boolean;
}

// ✅ GET
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  const item = events.find(e => e.id === params.id);
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(item);
}

// ✅ PUT (작성자만)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json() as Partial<Pick<CalendarEvent,'title'|'start'|'end'|'allDay'>>;
  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  const idx = events.findIndex(e => e.id === params.id);
  if (idx < 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (events[idx].userId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const updated: CalendarEvent = {
    ...events[idx],
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.start ? { start: body.start } : {}),
    ...(body.end ? { end: body.end } : {}),
    ...(body.allDay !== undefined ? { allDay: body.allDay } : {}),
  };
  events[idx] = updated;
  await kv.set(KEY, events);
  return NextResponse.json(updated);
}

// ✅ DELETE (작성자만)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  const item = events.find(e => e.id === params.id);
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (item.userId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  await kv.set(KEY, events.filter(e => e.id !== params.id));
  return NextResponse.json({ ok: true });
}
