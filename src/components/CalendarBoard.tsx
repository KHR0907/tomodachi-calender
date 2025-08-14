'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  dateFnsLocalizer,
} from 'react-big-calendar';
import type {
  Components,
  EventProps,
  ToolbarProps,
  View,
  SlotInfo,
} from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS, ko },
});

export type EventItem = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  userId: string;
  userName: string;
  color: string;
  allDay?: boolean;
};

type ApiEvent = Omit<EventItem, 'start' | 'end'> & { start: string; end: string };

export default function CalendarBoard({
  me,
}: { me: { id: string; name: string; color: string } | null; }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [view, setView] = useState<View>('month');

  // ★ 상세 모달 상태
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState(''); // yyyy-MM-dd
  const [editEnd, setEditEnd] = useState('');     // yyyy-MM-dd
  const isOwner = selected && me && selected.userId === me.id;

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/events', { cache: 'no-store' });
      const data = (await res.json()) as ApiEvent[];
      setEvents(data.map(e => ({
        ...e, start: new Date(e.start), end: new Date(e.end), allDay: true
      })));
    })();
  }, []);

  const handleSelectSlot = async (slot: SlotInfo) => {
    if (!me) return alert('일정을 추가하려면 로그인하세요.');
    const title = prompt('일정 내용 입력');
    if (!title) return;

    const normStart = startOfDay(slot.start);
    const normEnd = endOfDay(slot.end);

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        start: normStart.toISOString(),
        end: normEnd.toISOString(),
        userId: me.id,
        userName: me.name,
        color: me.color,
        allDay: true,
      }),
    });
    const created = (await res.json()) as ApiEvent;
    setEvents(prev => [...prev, {
      ...created, start: new Date(created.start), end: new Date(created.end), allDay: true
    }]);
  };

  // ★ 이벤트 클릭 → 상세 모달 열기
  const handleSelectEvent = (ev: EventItem) => {
    setSelected(ev);
    setEditTitle(ev.title);
    setEditStart(format(ev.start, 'yyyy-MM-dd'));
    setEditEnd(format(ev.end, 'yyyy-MM-dd'));
  };

  // ★ 수정 저장
  const saveChanges = async () => {
    if (!selected) return;
    if (!isOwner) return alert('본인 일정만 수정할 수 있어요.');

    const newStart = startOfDay(new Date(editStart));
    const newEnd = endOfDay(new Date(editEnd));

    const res = await fetch(`/api/events/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
        allDay: true,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert('수정 실패: ' + (j.error || res.status));
      return;
    }
    const upd = (await res.json()) as ApiEvent;
    setEvents(prev => prev.map(e => e.id === upd.id
      ? { ...e, title: upd.title, start: new Date(upd.start), end: new Date(upd.end), allDay: true }
      : e
    ));
    setSelected(null);
  };

  // ★ 삭제
  const deleteEvent = async () => {
    if (!selected) return;
    if (!isOwner) return alert('본인 일정만 삭제할 수 있어요.');
    if (!confirm('정말 삭제할까요?')) return;

    const res = await fetch(`/api/events/${selected.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert('삭제 실패: ' + (j.error || res.status));
      return;
    }
    setEvents(prev => prev.filter(e => e.id !== selected.id));
    setSelected(null);
  };

  // 스타일
  const eventPropGetter = (event: EventItem) => ({
    className: 'event-chip',
    style: { backgroundColor: event.color, borderColor: event.color },
  });

  const EventComp: React.FC<EventProps<EventItem>> = ({ event }) => (
    <div className="event-inner">
      <span className="badge">{event.userName}</span>
      <span className="title">{event.title}</span>
    </div>
  );

  const CustomToolbar: React.FC<ToolbarProps<EventItem>> = ({ date, onNavigate }) => {
    const label = format(date ?? new Date(), 'yyyy년 M월', { locale: ko });
    return (
      <div className="toss-toolbar">
        <div className="toolbar-center">
          <span className="toolbar-label">{label}</span>
          <div className="toolbar-nav">
            <button aria-label="이전 달" className="mini-btn" onClick={() => onNavigate?.('PREV')}>↑</button>
            <button aria-label="다음 달" className="mini-btn" onClick={() => onNavigate?.('NEXT')}>↓</button>
          </div>
        </div>
        <div className="toolbar-left">
          <button className="btn-ghost" onClick={() => onNavigate?.('TODAY')}>Today</button>
        </div>
      </div>
    );
  };

  const components: Components<EventItem> = useMemo(() => ({
    event: EventComp,
    toolbar: CustomToolbar,
  }), []);

  return (
    <div className="calendar-wrap toss">
      <Calendar<EventItem>
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}    // ★ 클릭 시 상세
        views={['month']}
        view={view}
        onView={(v) => setView(v)}
        popup
        culture="ko"
        components={components}
        eventPropGetter={eventPropGetter}
      />

      {/* ★ 상세 모달 */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">일정 상세</h3>

            <label className="field">
              <span>작성자</span>
              <div className="pill">{selected.userName}</div>
            </label>

            <label className="field">
              <span>제목</span>
              <input
                className="input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="일정 제목"
              />
            </label>

            <div className="row">
              <label className="field">
                <span>시작일</span>
                <input
                  type="date"
                  className="input"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                />
              </label>
              <label className="field">
                <span>종료일</span>
                <input
                  type="date"
                  className="input"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                />
              </label>
            </div>

            <div className="modal-actions">
              {isOwner ? (
                <>
                  <button className="btn danger" onClick={deleteEvent}>삭제</button>
                  <button className="btn primary" onClick={saveChanges}>저장</button>
                </>
              ) : (
                <div className="muted">소유자만 수정/삭제할 수 있습니다.</div>
              )}
              <button className="btn ghost" onClick={() => setSelected(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
