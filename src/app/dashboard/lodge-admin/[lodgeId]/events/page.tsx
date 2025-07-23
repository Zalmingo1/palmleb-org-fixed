'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'REGULAR' | 'SPECIAL' | 'MEETING';
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  attendees: number;
  maxAttendees?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function LodgeEventsPage({ params }: { params: Promise<{ lodgeId: string }> }) {
  const router = useRouter();
  const { lodgeId } = use(params);
  
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    type: 'REGULAR' as 'REGULAR' | 'SPECIAL' | 'MEETING',
    status: 'UPCOMING' as 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED',
    maxAttendees: 0
  });

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Get current user data for permission checks
      const userData = sessionStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user._id || user.id);
        setCurrentUserRole(user.role?.toUpperCase());
      }

      console.log('Fetching events for lodge:', lodgeId);
      console.log('Using token:', token ? 'Token present' : 'No token');

      const response = await fetch(`/api/lodges/${lodgeId}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch events');
      }

      const data = await response.json();
      console.log('Received events data:', data);
      
      if (!data.events) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format: expected events array');
      }
      
      setEvents(data.events);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if user can edit/delete an event
  const canEditEvent = (event: Event) => {
    if (!currentUserId || !currentUserRole) return false;
    
    // SUPER_ADMIN and DISTRICT_ADMIN can edit any event
    if (currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'DISTRICT_ADMIN') {
      return true;
    }
    
    // LODGE_ADMIN can only edit events they created
    if (currentUserRole === 'LODGE_ADMIN') {
      return event.createdBy === currentUserId;
    }
    
    return false;
  };

  useEffect(() => {
    fetchEvents();
  }, [lodgeId]);

  const handleAddEvent = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/lodges/${lodgeId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEvent)
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      setShowAddModal(false);
      setNewEvent({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        type: 'REGULAR',
        status: 'UPCOMING',
        maxAttendees: 0
      });
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event. Please try again.');
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent) return;

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/lodges/${lodgeId}/events/${selectedEvent._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedEvent)
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      setShowEditModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event. Please try again.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/lodges/${lodgeId}/events/${selectedEvent._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      setShowDeleteModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event. Please try again.');
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Lodge Events</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Event
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <div
            key={event._id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  event.status === 'UPCOMING' ? 'bg-green-100 text-green-800' :
                  event.status === 'ONGOING' ? 'bg-blue-100 text-blue-800' :
                  event.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {event.status}
                </span>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>

              <div className="space-y-2">
                <div className="flex items-center text-gray-500">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  <span>{event.attendees} {event.maxAttendees ? `/ ${event.maxAttendees}` : ''} attendees</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                {canEditEvent(event) ? (
                  <>
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEditModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-500"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowDeleteModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">No permissions</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Event</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                    Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Event Type
                </label>
                <select
                  id="type"
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as 'REGULAR' | 'SPECIAL' | 'MEETING' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="REGULAR">Regular Meeting</option>
                  <option value="SPECIAL">Special Event</option>
                  <option value="MEETING">Committee Meeting</option>
                </select>
              </div>
              <div>
                <label htmlFor="maxAttendees" className="block text-sm font-medium text-gray-700">
                  Maximum Attendees (optional)
                </label>
                <input
                  type="number"
                  id="maxAttendees"
                  value={newEvent.maxAttendees}
                  onChange={(e) => setNewEvent({ ...newEvent, maxAttendees: parseInt(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  min="0"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Event</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="edit-title"
                  value={selectedEvent.title}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={selectedEvent.description}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    id="edit-date"
                    value={selectedEvent.date}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, date: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-time" className="block text-sm font-medium text-gray-700">
                    Time
                  </label>
                  <input
                    type="time"
                    id="edit-time"
                    value={selectedEvent.time}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, time: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  id="edit-location"
                  value={selectedEvent.location}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, location: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700">
                  Event Type
                </label>
                <select
                  id="edit-type"
                  value={selectedEvent.type}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, type: e.target.value as 'REGULAR' | 'SPECIAL' | 'MEETING' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="REGULAR">Regular Meeting</option>
                  <option value="SPECIAL">Special Event</option>
                  <option value="MEETING">Committee Meeting</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="edit-status"
                  value={selectedEvent.status}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, status: e.target.value as 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-maxAttendees" className="block text-sm font-medium text-gray-700">
                  Maximum Attendees (optional)
                </label>
                <input
                  type="number"
                  id="edit-maxAttendees"
                  value={selectedEvent.maxAttendees}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, maxAttendees: parseInt(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  min="0"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEditEvent}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Event</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete "{selectedEvent.title}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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