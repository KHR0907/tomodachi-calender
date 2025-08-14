'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, type SlotInfo, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS, ko },
});

// 클라이언트에서 사용하는 이벤트 타입 (Date 객체)
export type EventItem = {
  id: string;
  title: string;
  start: Date; // 하루 단위
  end: Date;   // 하루 단위
  userId: string;
  userName: string;
  color: string; // rgba(..., 0.45)
  allDay?: boolean;
};

// 서버 응답 타입 (문자열 날짜)
type ApiEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  userId: string;
  userName: string;
  color: string;
  allDay?: boolean;
};

export default function CalendarBoard({
  me,
}: {
  me: { id: string; name: string; color: string } | null;
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [view, setView] = useState<View>('month');

  // 최초 로드
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/events', { cache: 'no-store' });
      const data = (await res.json()) as ApiEvent[];
      setEvents(
        data.map((e) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
          allDay: true,
        }))
      );
    })();
  }, []);

  // 드래그로 날짜(일 단위) 선택 → 일정 내용 입력
  const handleSelectSlot = async (slot: SlotInfo) => {
    if (!me) return alert('일정을 추가하려면 로그인하세요.');
    const title = prompt('일정 내용 입력 (일 단위)');
    if (!title) return;

    // 월 달력에선 시간 불필요 → 하루(또는 연속일) 단위로 정규화
    const normStart = startOfDay(slot.start);
    const normEnd = endOfDay(slot.end);

    const payload = {
      title,
      start: normStart,
      end: normEnd,
      userId: me.id,
      userName: me.name,
      color: me.color,
      allDay: true,
    };

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        start: payload.start.toISOString(),
        end: payload.end.toISOString(),
      }),
    });
    const created = (await res.json()) as ApiEvent;

    setEvents((prev) => [
      ...prev,
      {
        ...created,
        start: new Date(created.start),
        end: new Date(created.end),
        allDay: true,
      },
    ]);
  };

  // 사용자 색상 적용 + 살짝 둥글고 그림자
  const eventPropGetter = (event: EventItem) => ({
    className: 'event-chip',
    style: {
      backgroundColor: event.color,
      borderColor: event.color,
    },
  });

  // 이벤트 카드 안에 사용자명 뱃지 + 제목
  const components = useMemo(
    () => ({
      event: ({ event }: { event: EventItem }) => (
        <div className="event-inner">
          <span className="badge">{event.userName}</span>
          <span className="title">{event.title}</span>
        </div>
      ),
    }),
    []
  );

  return (
    <div className="calendar-wrap">
<Calendar<EventItem>
  localizer={localizer}
  events={events}
  startAccessor="start"
  endAccessor="end"
  selectable
  onSelectSlot={handleSelectSlot}
  views={['month']}        // 월 뷰만
  view={view}
  onView={(v) => setView(v)}
  popup
  culture="ko"
  components={components}
  eventPropGetter={eventPropGetter}  // ← 이 줄이 있어야 경고 없음
/>
    </div>
  );
}
