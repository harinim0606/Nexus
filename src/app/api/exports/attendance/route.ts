import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent } from '@/lib/roles';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!canManageEvent(user.role, event.coordinatorId, event.studentCoordinatorId, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const regs = await prisma.registration.findMany({
      where: { eventId, status: { not: 'CANCELLED' } },
      include: { user: true, attendance: true },
      orderBy: { createdAt: 'asc' },
    });

    const rows = regs.map((r) => ({
      name: r.user.name,
      email: r.user.email,
      registrationStatus: r.status,
      present: r.attendance ? 'Yes' : 'No',
      checkedInAt: r.attendance ? r.attendance.checkedInAt.toISOString() : '',
    }));

    if (format === 'pdf') {
      const doc = new jsPDF();
      let y = 16;
      doc.setFontSize(14);
      doc.text(`Attendance — ${event.name}`, 14, y);
      y += 8;
      doc.setFontSize(9);
      doc.text(`Generated ${new Date().toLocaleString()}`, 14, y);
      y += 10;
      doc.setFontSize(10);
      rows.forEach((row, i) => {
        if (y > 275) {
          doc.addPage();
          y = 16;
        }
        const line = `${i + 1}. ${row.name} | ${row.email} | ${row.registrationStatus} | Present: ${row.present}${
          row.checkedInAt ? ` | ${row.checkedInAt}` : ''
        }`;
        doc.text(line, 14, y);
        y += 7;
      });
      const buf = doc.output('arraybuffer');
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="nexus-attendance-${eventId}.pdf"`,
        },
      });
    }

    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Attendance');
    const ab = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new NextResponse(Buffer.from(ab), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="nexus-attendance-${eventId}.xlsx"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
