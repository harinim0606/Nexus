/** Confirmed seat / active participant */
export const CONFIRMED = 'CONFIRMED';
/** Waiting for a seat */
export const WAITLISTED = 'WAITLISTED';
export const CANCELLED = 'CANCELLED';
/** Waitlist not accommodated after finalization (24h before event) */
export const DECLINED = 'DECLINED';

export const ACTIVE_REGISTRATION_STATUSES = [CONFIRMED, WAITLISTED] as const;

export function isActiveRegistrationStatus(status: string): boolean {
  return status === CONFIRMED || status === WAITLISTED;
}
