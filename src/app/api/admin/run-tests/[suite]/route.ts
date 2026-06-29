import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ suite: string }> }
) {
  const { suite } = await params;
  const backendUrl = (process.env.BACKEND_INTERNAL_URL || 'https://102826.stu.sd-lab.nl/SocialSportBackend/public').replace(/\/$/, '');
  const authorization = request.headers.get('Authorization') ?? '';

  const backendResponse = await fetch(`${backendUrl}/api/admin/run-tests/${suite}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    signal: AbortSignal.timeout(120_000),
  });

  const data = await backendResponse.json();
  return NextResponse.json(data, { status: backendResponse.status });
}
