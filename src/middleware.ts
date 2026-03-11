import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const expected = process.env.ADMIN_BASIC_AUTH; // format: "user:password"

  if (!expected) return NextResponse.next(); // no auth configured, allow (dev mode)

  if (auth) {
    const [, encoded] = auth.split(' ');
    const decoded = atob(encoded || '');
    if (decoded === expected) return NextResponse.next();
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
