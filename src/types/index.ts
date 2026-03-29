export type Role = 'ADMIN' | 'EVENT_COORDINATOR' | 'FACULTY_COORDINATOR' | 'STUDENT_COORDINATOR' | 'STUDENT';

export type EventType = 'INDIVIDUAL' | 'TEAM';

export type RegistrationStatus = 'REGISTERED' | 'WAITLIST';

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
  coordinator: User;
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
  teamMembers?: string;
  status: RegistrationStatus;
  qrCode?: string;
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
  eventId: string;
  event: Event;
  message: string;
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