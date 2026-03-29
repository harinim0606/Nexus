'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Event, User } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    type: 'INDIVIDUAL',
    maxParticipants: '',
    coordinatorId: '',
  });

  useEffect(() => {
    const load = async () => {
      const eventsRes = await fetch('/api/events');
      const eventsData = await eventsRes.json();
      setEvents(eventsData);

      // Fetch users with coordinator roles
      const coordsRes = await fetch('/api/users?role=EVENT_COORDINATOR');
      const coordsData = await coordsRes.json();
      setCoordinators(coordsData);
    };

    load();
  }, []);

  const refreshEvents = async () => {
    const eventsRes = await fetch('/api/events');
    const eventsData = await eventsRes.json();
    setEvents(eventsData);
  };

  const parseStartEndFromTime = (time: string) => {
    const match = (time ?? '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!match) return { startTime: '', endTime: '' };
    return { startTime: match[1], endTime: match[2] };
  };

  const openEdit = (event: Event) => {
    const { startTime, endTime } = parseStartEndFromTime(event.time);
    setEditingEventId(event.id);
    setShowForm(true);
    setFormData({
      name: event.name,
      description: event.description ?? '',
      date: new Date(event.date).toISOString().slice(0, 10),
      startTime,
      endTime,
      venue: event.venue,
      type: event.type,
      maxParticipants: event.maxParticipants ? String(event.maxParticipants) : '',
      coordinatorId: event.coordinatorId,
    });
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      const res = await fetch('/api/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId }),
      });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete event');
        return;
      }
      toast.success('Event deleted');
      await refreshEvents();
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const time = formData.startTime && formData.endTime ? `${formData.startTime} - ${formData.endTime}` : '';
      const payload = {
        name: formData.name,
        description: formData.description,
        date: formData.date,
        time,
        venue: formData.venue,
        type: formData.type,
        maxParticipants: formData.maxParticipants ? Number(formData.maxParticipants) : null,
        coordinatorId: formData.coordinatorId,
      };

      const method = editingEventId ? 'PUT' : 'POST';
      const res = await fetch('/api/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEventId ? { id: editingEventId, ...payload } : payload),
      });
      if (res.ok) {
        toast.success(editingEventId ? 'Event updated!' : 'Event created!');
        setShowForm(false);
        setEditingEventId(null);
        setFormData({
          name: '',
          description: '',
          date: '',
          startTime: '',
          endTime: '',
          venue: '',
          type: 'INDIVIDUAL',
          maxParticipants: '',
          coordinatorId: '',
        });
        await refreshEvents();
      } else {
        const error = await res.json();
        toast.error(error.error);
      }
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Event Management</h1>
          <button
            onClick={() => {
              setEditingEventId(null);
              setShowForm(true);
              setFormData({
                name: '',
                description: '',
                date: '',
                startTime: '',
                endTime: '',
                venue: '',
                type: 'INDIVIDUAL',
                maxParticipants: '',
                coordinatorId: '',
              });
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Create Event
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Events</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Venue</th>
                <th className="text-left py-2">Coordinator</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className="border-b">
                  <td className="py-2">{event.name}</td>
                  <td className="py-2">{new Date(event.date).toLocaleDateString()}</td>
                  <td className="py-2">{event.venue}</td>
                  <td className="py-2">{event.coordinator.name}</td>
                  <td className="py-2">
                    <button
                      className="text-indigo-600 hover:text-indigo-800 mr-2"
                      onClick={() => openEdit(event)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDelete(event.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">
                {editingEventId ? 'Edit Event' : 'Create Event'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Event Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded"
                />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="Venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="TEAM">Team</option>
                </select>
                <input
                  type="number"
                  placeholder="Max Participants"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  className="w-full p-2 border rounded"
                />
                <select
                  value={formData.coordinatorId}
                  onChange={(e) => setFormData({ ...formData, coordinatorId: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Coordinator</option>
                  {coordinators.map(coord => (
                    <option key={coord.id} value={coord.id}>{coord.name}</option>
                  ))}
                </select>
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
                  {editingEventId ? 'Save' : 'Create'}
                </button>
              </form>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingEventId(null);
                }}
                className="mt-4 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
}