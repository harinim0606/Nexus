'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import EventCard from '@/components/EventCard';
import RegistrationForm from '@/components/RegistrationForm';
import Footer from '@/components/Footer';
import Modal from '@/components/Modal';
import { Event, TeamMember } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

type MyRegistration = {
  id: string;
  event: Event;
  status: 'REGISTERED' | 'WAITLIST';
  attendance?: { id: string; checkedInAt: string } | null;
};

export default function ExploreEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [myRegs, setMyRegs] = useState<MyRegistration[]>([]);
  const [qrModal, setQrModal] = useState<{ open: boolean; image?: string; eventName?: string }>({
    open: false,
  });

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data);
  };

  const fetchMyRegs = async () => {
    const res = await fetch('/api/registrations/my');
    if (!res.ok) return;
    const data = await res.json();
    setMyRegs(data);
  };

  useEffect(() => {
    const load = async () => {
      await fetchEvents();
      await fetchMyRegs();
    };

    load();
  }, []);

  const handleRegister = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setShowForm(true);
    }
  };

  const handleFormSubmit = async (data: { teamMembers?: TeamMember[] }) => {
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent!.id,
          teamMembers: data.teamMembers,
        }),
      });
      if (res.ok) {
        toast.success('Registration successful!');
        setShowForm(false);
        setSelectedEvent(null);
        await fetchMyRegs();
      } else {
        const error = await res.json();
        toast.error(error.error);
      }
    } catch (error) {
      toast.error('Registration failed');
    }
  };

  const openQr = async (registrationId: string, eventName: string) => {
    const res = await fetch(`/api/registrations/${registrationId}/qr`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'QR not available yet');
      return;
    }
    setQrModal({ open: true, image: data.qrDataUrl, eventName });
  };

  return (
    <div className="min-h-screen nexus-animated-bg">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="enter-up mb-8">
          <h1 className="text-3xl font-black text-slate-900 md:text-4xl">Explore Events</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Browse upcoming individual and team events. Smooth registration flow, instant updates, and QR-ready access.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map(event => (
            <EventCard key={event.id} event={event} onRegister={handleRegister} />
          ))}
        </div>

        <div className="nexus-card mt-12 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">My Registrations</h2>
          <div className="space-y-3">
            {myRegs.length === 0 && <p className="text-sm text-slate-500">No registrations yet.</p>}
            {myRegs.map((reg) => (
              <div key={reg.id} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{reg.event.name}</p>
                  <p className="text-sm text-slate-600">{new Date(reg.event.date).toLocaleDateString()} • {reg.event.time}</p>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">Status: {reg.status}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openQr(reg.id, reg.event.name)}
                    className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-[var(--primary-dark)]"
                  >
                    View QR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={showForm && !!selectedEvent}
        title={selectedEvent ? `Register for ${selectedEvent.name}` : 'Register'}
        onClose={() => setShowForm(false)}
      >
        {selectedEvent ? (
          <RegistrationForm
            eventId={selectedEvent.id}
            eventType={selectedEvent.type}
            onSubmit={handleFormSubmit}
          />
        ) : null}
      </Modal>

      <Modal
        open={qrModal.open}
        title={qrModal.eventName ? `${qrModal.eventName} QR` : 'Event QR'}
        onClose={() => setQrModal({ open: false })}
      >
        {qrModal.image ? <img src={qrModal.image} alt="Event QR code" className="w-full rounded-xl border border-slate-200" /> : null}
      </Modal>

      <Toaster />
      <Footer />
    </div>
  );
}