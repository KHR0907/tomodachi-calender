import './globals.css';
import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

export const metadata = {
  title: 'Tomodachi Calendar',
  description: '월 달력 · 드래그로 일정 입력',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <html lang="ko">
      <body>
        <header className="app-header">
          <Link className="brand" href="/">📅 Tomodachi Calendar</Link>
          <nav className="nav">
  {user ? (
    <>
      {/* 로그아웃 */}
      <Link className="btn ghost" href="/api/auth/signout">Logout</Link>
    </>
  ) : (
    /* 로그인 */
    <Link className="btn primary" href="/api/auth/signin">Login with Discord</Link>
  )}
</nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
