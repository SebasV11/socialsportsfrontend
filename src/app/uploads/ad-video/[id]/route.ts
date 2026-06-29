import { NextRequest } from 'next/server';

/**
 * Upload-proxy voor advertentievideo's.
 *
 * De gewone `/api/*` rewrite proxyt naar de Laravel dev-server (php artisan serve),
 * maar diens ingebouwde webserver kan grote multipart-bodies die de Next-proxy
 * "chunked" doorstuurt niet lezen (faalt met "Unexpected EOF" boven ~10MB).
 *
 * Deze route handler buffert de volledige upload en stuurt 'm met een
 * Content-Length door, zodat de PHP-server de body wél volledig ontvangt.
 * Het pad valt bewust buiten `/api` zodat de rewrite het niet onderschept.
 */
export const runtime = 'nodejs';

const BACKEND = (process.env.BACKEND_INTERNAL_URL || 'https://102826.stu.sd-lab.nl/SocialSportBackend/public').replace(/\/$/, '');

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = Buffer.from(await req.arrayBuffer());

  const res = await fetch(`${BACKEND}/api/admin/advertisements/${encodeURIComponent(id)}/upload-video`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers.get('content-type') ?? '',
      Authorization: req.headers.get('authorization') ?? '',
      Accept: 'application/json',
    },
    body,
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}
