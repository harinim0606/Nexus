import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent } from '@/lib/roles';
import { buildCertificatePdf } from '@/lib/certificatePdf';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!canManageEvent(user.role, event.coordinatorId, event.studentCoordinatorId, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tpl = await prisma.certificateTemplate.findUnique({ where: { eventId } });
    const body = (await request.json().catch(() => ({}))) as Partial<{
      participantName: string;
      eventName: string;
      email: string;
      issuedDate: string;
      templateData: string;
    }>;

    const templateStr =
      typeof body.templateData === 'string' && body.templateData.trim()
        ? body.templateData
        : tpl?.templateData ?? '{}';

    const vars = {
      participantName: body.participantName ?? 'Sample Participant',
      eventName: body.eventName ?? event.name,
      email: body.email ?? 'participant@example.com',
      issuedDate: body.issuedDate ?? new Date().toLocaleDateString(),
    };

    const pdfBytes = await buildCertificatePdf(templateStr, vars);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename=nexus-cert-preview.pdf',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
