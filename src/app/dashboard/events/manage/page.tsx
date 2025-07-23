'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserGroupIcon, 
  ClockIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon 
} from '@heroicons/react/24/outline';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  attendees: number;
  lodgeId?: string;
}

export default function ManageEventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [lodgeId, setLodgeId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    lodgeId: ''
  });

  useEffect(() => {
    // Check authentication and role
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const role = sessionStorage.getItem('userRole');
    const userData = sessionStorage.getItem('user');
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Only allow admins to access this page
    if (role !== 'LODGE_ADMIN' && role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    setUserRole(role);

    // Get lodge ID from URL or user data
    const urlLodgeId = searchParams.get('lodgeId');
    console.log('URL lodge ID:', urlLodgeId);
    
    if (urlLodgeId) {
      console.log('Setting lodge ID from URL:', urlLodgeId);
      setLodgeId(urlLodgeId);
      setNewEvent(prev => ({ ...prev, lodgeId: urlLodgeId }));
    } else if (userData) {
      const user = JSON.parse(userData);
      console.log('User data:', user);
      const userLodgeId = typeof user.primaryLodge === 'string' ? user.primaryLodge : user.primaryLodge?._id;
      console.log('User lodge ID:', userLodgeId);
      if (userLodgeId) {
        console.log('Setting lodge ID from user data:', userLodgeId);
        setLodgeId(userLodgeId);
        setNewEvent(prev => ({ ...prev, lodgeId: userLodgeId }));
      }
    }

  }, [router, searchParams]);

  const fetchEvents = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      if (!lodgeId) {
        console.error('No lodge ID found');
        return;
      }

      const response = await fetch(`/api/events?lodgeId=${lodgeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      setEvents(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setIsLoading(false);
    }
  };

  // Fetch events when lodgeId is available
  useEffect(() => {
    console.log('LodgeId changed:', lodgeId);
    if (lodgeId) {
      console.log('Fetching events for lodge:', lodgeId);
      fetchEvents();
    }
  }, [lodgeId]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleAddEvent = async () => {
    try {
      if (!lodgeId) {
        throw new Error('No lodge ID found');
      }

      const eventWithId = {
        ...newEvent,
        attendees: 0,
        lodgeId
      };

      const token = sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventWithId),
      });

      if (!response.ok) throw new Error('Failed to add event');
      
      setShowAddModal(false);
      setNewEvent({
        title: '',
        date: '',
        time: '',
        location: '',
        description: '',
        lodgeId
      });
      await fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      alert(error instanceof Error ? error.message : 'Failed to add event');
    }
  };

  const handleEditEvent = async () => {
    if (!currentEvent) return;
    try {
      const token = sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`/api/events/${currentEvent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentEvent),
      });

      if (!response.ok) throw new Error('Failed to update event');
      
      setShowEditModal(false);
      setCurrentEvent(null);
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      alert(error instanceof Error ? error.message : 'Failed to update event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!currentEvent) return;
    try {
      const token = sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`/api/events/${currentEvent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete event');
      
      setShowDeleteModal(false);
      setCurrentEvent(null);
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete event');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manage Events</h1>
          <p className="text-gray-600">Add, edit, or remove events for your lodge</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push(`/dashboard/events?lodgeId=${lodgeId}`)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            View Events
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Event
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h2>
          <p className="text-gray-600 mb-6">There are no upcoming events scheduled at this time.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create First Event
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendees
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{event.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(event.date)}</div>
                    <div className="text-sm text-gray-500">{event.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.attendees} registered</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setCurrentEvent(event);
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentEvent(event);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="e.g. 18:00 - 21:00"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  rows={3}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                disabled={!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.location}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && currentEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  value={currentEvent.title}
                  onChange={(e) => setCurrentEvent({...currentEvent, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  value={currentEvent.date}
                  onChange={(e) => setCurrentEvent({...currentEvent, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  value={currentEvent.time}
                  onChange={(e) => setCurrentEvent({...currentEvent, time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  value={currentEvent.location}
                  onChange={(e) => setCurrentEvent({...currentEvent, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  rows={3}
                  value={currentEvent.description}
                  onChange={(e) => setCurrentEvent({...currentEvent, description: e.target.value})}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attendees</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  value={currentEvent.attendees}
                  onChange={(e) => setCurrentEvent({...currentEvent, attendees: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Event</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the event "{currentEvent.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 