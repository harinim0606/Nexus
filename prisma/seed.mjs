import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser({ email, password, name, role }) {
  const hashedPassword = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      password: hashedPassword,
      isVerified: true,
      otp: null,
      otpExpiry: null,
    },
    create: {
      email,
      name,
      role,
      password: hashedPassword,
      isVerified: true,
    },
  });
}

async function main() {
  const users = [
    {
      email: 'admin@nexus.local',
      password: 'Admin@12345',
      name: 'Admin',
      role: 'ADMIN',
    },
    {
      email: 'faculty.coordinator@nexus.local',
      password: 'Faculty@12345',
      name: 'Faculty Coordinator',
      role: 'FACULTY_COORDINATOR',
    },
    {
      email: 'student.coordinator@nexus.local',
      password: 'Student@12345',
      name: 'Student Coordinator',
      role: 'STUDENT_COORDINATOR',
    },
  ];

  for (const u of users) {
    const saved = await upsertUser(u);
    console.log(`Seeded: ${saved.email} (${saved.role})`);
  }

  const faculty = await prisma.user.findFirst({ where: { role: 'FACULTY_COORDINATOR' } });
  const studentCoord = await prisma.user.findFirst({ where: { role: 'STUDENT_COORDINATOR' } });

  if (faculty) {
    const exists = await prisma.event.count();
    if (exists === 0) {
      const day = new Date();
      day.setDate(day.getDate() + 14);
      await prisma.event.create({
        data: {
          name: 'NEXUS Innovation Summit',
          description: 'Keynotes, workshops, and live demos across AI & campus ops.',
          date: day,
          time: '09:00 - 17:00',
          venue: 'Main Auditorium',
          type: 'INDIVIDUAL',
          maxParticipants: 120,
          coordinatorId: faculty.id,
          studentCoordinatorId: studentCoord?.id ?? null,
          category: 'Symposium',
          rules: 'Please arrive 15 minutes early.\nCarry your college ID.\nNo food inside the auditorium.',
          onlineLink: null,
          posterUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
        },
      });
      await prisma.event.create({
        data: {
          name: 'Hackathon — Build Night (Team)',
          description: 'Overnight team build with mentors and live scoring.',
          date: new Date(day.getTime() + 86400000),
          time: '18:00 - 23:00',
          venue: 'Innovation Lab',
          type: 'TEAM',
          maxParticipants: 40,
          coordinatorId: faculty.id,
          studentCoordinatorId: studentCoord?.id ?? null,
          category: 'Technology',
          rules: 'Teams of up to 4.\nBring your laptop and charger.',
        },
      });
      console.log('Seeded sample events');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
