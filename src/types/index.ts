export type Role =
  | 'ADMIN'
  | 'EVENT_COORDINATOR'
  | 'FACULTY_COORDINATOR'
  | 'STUDENT_COORDINATOR'
  | 'STUDENT'
  | 'PARTICIPANT';

export type EventType = 'INDIVIDUAL' | 'TEAM';

export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'DECLINED';

export interface User {
  id: string;
  email: string;
  password?: string;
  role: Role;
  name: string;
  isVerified: boolean;
  otp?: string;
  otpExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: Date;
  time: string;
  venue: string;
  type: EventType;
  maxParticipants?: number;
  coordinatorId: string;
  studentCoordinatorId?: string | null;
  coordinator: User;
  studentCoordinator?: User | null;
  posterUrl?: string | null;
  rules?: string | null;
  onlineLink?: string | null;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Registration {
  id: string;
  eventId: string;
  event: Event;
  userId: string;
  user: User;
  teamName?: string | null;
  teamCollegeName?: string | null;
  teamDepartment?: string | null;
  leaderName?: string | null;
  leaderEmail?: string | null;
  leaderPhone?: string | null;
  teamMembers?: string | null;
  memberEmails?: string | null;
  participantDetails?: string | null;
  status: RegistrationStatus;
  waitlistPosition?: number | null;
  qrCode?: string;
  qrEmailSentAt?: Date | null;
  attendance?: Attendance | null;
  createdAt: Date;
}

export interface Attendance {
  id: string;
  registrationId: string;
  registration: Registration;
  checkedInAt: Date;
}

export interface Certificate {
  id: string;
  eventId: string;
  event: Event;
  userId: string;
  user: User;
  template: string;
  issuedAt: Date;
}

export interface ChatMessage {
  id: string;
  eventId: string;
  event: Event;
  userId: string;
  user: User;
  message: string;
  timestamp: Date;
}

export interface Announcement {
  id: string;
  eventId?: string | null;
  event?: Event | null;
  message: string;
  subject?: string | null;
  audience: string;
  timestamp: Date;
}

export interface FeedbackForm {
  id: string;
  eventId: string;
  event: Event;
  questions: string;
  responses?: string;
  createdAt: Date;
}

export interface TeamMember {
  name: string;
}

export type TeamRosterRow = {
  name: string;
  email: string;
  phone: string;
};

/** Payload sent with POST /api/registrations */
export type RegistrationParticipantDetails =
  | {
      kind: 'individual';
      fullName: string;
      email: string;
      phone: string;
      collegeName: string;
      department: string;
      yearOfStudy: string;
      gender: string;
    }
  | {
      kind: 'team';
      teamName: string;
      teamCollegeName: string;
      teamDepartment: string;
      leaderName: string;
      leaderEmail: string;
      leaderPhone: string;
      members: TeamRosterRow[];
    };

export interface FeedbackQuestion {
  id: string;
  question: string;
  type: 'text' | 'multiple_choice' | 'rating';
  options?: string[];
}

export interface FeedbackResponse {
  questionId: string;
  answer: string;
}