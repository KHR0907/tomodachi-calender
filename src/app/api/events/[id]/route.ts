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

/** 유틸: 컨텍스트에서 id 꺼내기 (런타임 캐스팅) */
function getIdFromContext(ctx: unknown): string {
  const { params } = ctx as { params?: { id?: string } };
  if (!params?.id) throw new Error('missing id');
  return params.id;
}

// GET /api/events/[id]
export async function GET(_req: Request, ctx: unknown) {
  const id = getIdFromContext(ctx);
  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  const item = events.find((e) => e.id === id);
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(item);
}

// PUT /api/events/[id]  (작성자만)
export async function PUT(req: Request, ctx: unknown) {
  const id = getIdFromContext(ctx);

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as Partial<
    Pick<CalendarEvent, 'title' | 'start' | 'end' | 'allDay'>
  >;

  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  const idx = events.findIndex((e) => e.id === id);
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

// DELETE /api/events/[id]  (작성자만)
export async function DELETE(_req: Request, ctx: unknown) {
  const id = getIdFromContext(ctx);

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const events = (await kv.get<CalendarEvent[]>(KEY)) ?? [];
  const item = events.find((e) => e.id === id);
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (item.userId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await kv.set(KEY, events.filter((e) => e.id !== id));
  return NextResponse.json({ ok: true });
}
