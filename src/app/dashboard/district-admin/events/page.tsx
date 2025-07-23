'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserGroupIcon, 
  ClockIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon,
  EyeIcon
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
  lodgeName?: string;
  isDistrictWide?: boolean;
}

interface Attendee {
  _id: string;
  name: string;
  email: string;
}

export default function DistrictAdminEventsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    lodgeId: '',
    isDistrictWide: true
  });
  const [availableLodges, setAvailableLodges] = useState<any[]>([]);

  useEffect(() => {
    // Check authentication and role
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const role = sessionStorage.getItem('userRole');
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Only allow district admins to access this page
    if (role !== 'DISTRICT_ADMIN') {
      router.push('/dashboard');
      return;
    }

    setUserRole(role);
    fetchDistrictEvents();
    fetchAvailableLodges();
  }, [router]);

  const fetchAvailableLodges = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/lodges?district=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch lodges');

      const data = await response.json();
      setAvailableLodges(data);
    } catch (error) {
      console.error('Error fetching lodges:', error);
    }
  };

  const fetchDistrictEvents = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      // Fetch events from all lodges in the district
      const response = await fetch('/api/events?district=true', {
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

  const handleViewAttendees = async (event: Event) => {
    try {
      setIsLoadingAttendees(true);
      setCurrentEvent(event);
      setShowAttendeesModal(true);

      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Fetching attendees for event:', event.id);

      const response = await fetch(`/api/events/${event.id}/attendees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch attendees: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched attendees:', data);

      setAttendees(data.attendees || []);
    } catch (error) {
      console.error('Error fetching attendees:', error);
      setAttendees([]);
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleAddEvent = async () => {
    try {
      if (!newEvent.isDistrictWide && !newEvent.lodgeId) {
        throw new Error('Please select a lodge for the event or mark it as district-wide');
      }

      const eventWithId = {
        ...newEvent,
        attendees: 0,
        lodgeId: newEvent.isDistrictWide ? null : newEvent.lodgeId,
        isDistrictWide: newEvent.isDistrictWide || false
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
        lodgeId: '',
        isDistrictWide: true
      });
      await fetchDistrictEvents();
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
      await fetchDistrictEvents();
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
      await fetchDistrictEvents();
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
          <h1 className="text-2xl font-semibold text-gray-900">Manage District Events</h1>
          <p className="text-gray-600">Add, edit, or remove events for all lodges in your district</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push('/dashboard/events')}
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
          <p className="text-gray-600 mb-6">There are no upcoming events scheduled in your district at this time.</p>
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
                  Scope
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
                    {event.isDistrictWide ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        District-wide
                      </span>
                    ) : (
                      <div className="text-sm text-gray-900">{event.lodgeName || 'Unknown Lodge'}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(event.date)}</div>
                    <div className="text-sm text-gray-500">{event.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-900">{event.attendees} registered</div>
                      {event.attendees > 0 && (
                        <button
                          onClick={() => handleViewAttendees(event)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Attendees"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDistrictWide"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={newEvent.isDistrictWide}
                  onChange={(e) => setNewEvent({...newEvent, isDistrictWide: e.target.checked, lodgeId: ''})}
                />
                <label htmlFor="isDistrictWide" className="text-sm font-medium text-gray-700">
                  District-wide event (visible to all members in the district)
                </label>
              </div>
              
              {!newEvent.isDistrictWide && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lodge</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    value={newEvent.lodgeId}
                    onChange={(e) => setNewEvent({...newEvent, lodgeId: e.target.value})}
                  >
                    <option value="">Select a lodge</option>
                    {availableLodges.map((lodge) => (
                      <option key={lodge._id} value={lodge._id}>
                        {lodge.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
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
                disabled={!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.location || (!newEvent.isDistrictWide && !newEvent.lodgeId)}
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
              Are you sure you want to delete the event "{currentEvent.title}"? This action is permanent and cannot be undone.
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

      {/* Attendees Modal */}
      {showAttendeesModal && currentEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Attendees for {currentEvent.title}
              </h3>
              <button
                onClick={() => setShowAttendeesModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isLoadingAttendees ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-900"></div>
              </div>
            ) : attendees.length > 0 ? (
              <div className="space-y-2">
                {attendees.map((attendee) => (
                  <div key={attendee._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attendee.name}</p>
                      <p className="text-xs text-gray-500">{attendee.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No attendees registered yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 