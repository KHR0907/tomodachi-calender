import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import CalendarBoard from '@/components/CalendarBoard';

function colorFromId(id: string) {
  let hash = 0; for (let i=0;i<id.length;i++) hash = (hash*31 + id.charCodeAt(i))>>>0;
  const r = (hash & 0xff0000) >> 16, g = (hash & 0x00ff00) >> 8, b = hash & 0x0000ff;
  return `rgba(${r}, ${g}, ${b}, 0.45)`;
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  const me = session?.user ? {
    id: (session.user as any).id as string,
    name: session.user.name ?? 'User',
    color: colorFromId(((session.user as any).id as string) || 'x')
  } : null;

  return (
    <div>
      <p style={{ marginBottom: 12 }}>캘린더 빈 영역을 드래그하면 일정 입력창이 뜹니다. 로그인하면 내 이름/색상으로 저장됩니다.</p>
      <CalendarBoard me={me} />
    </div>
  );
}