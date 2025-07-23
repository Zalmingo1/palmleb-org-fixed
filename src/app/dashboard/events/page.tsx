'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarIcon, MapPinIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Event {
  id: string;
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  isRegistered?: boolean;
}

interface Attendee {
  _id: string;
  name: string;
  email: string;
}

export default function EventsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);

  useEffect(() => {
    // Check authentication and role
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const role = sessionStorage.getItem('userRole');
    const userData = sessionStorage.getItem('user');
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setUserRole(role);

    // Get lodge ID from user data
    let lodgeId = null;
    if (userData) {
      const user = JSON.parse(userData);
      lodgeId = user.primaryLodge?._id || user.primaryLodge;
    }

    if (!lodgeId) {
      console.error('No lodge ID found in user data');
      setIsLoading(false);
      return;
    }

    // Fetch events from the API
    const token = sessionStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      setIsLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/events?lodgeId=${lodgeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        console.log('Fetched events:', data);
        
        // Fetch registration status for each event
        const eventsWithRegistrationStatus = await Promise.all(
          data.map(async (event: Event) => {
            console.log('Checking status for event:', event);
            const registrationResponse = await fetch(`/api/events/${event._id}/status`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            const registrationData = await registrationResponse.json();
            console.log('Registration status for event:', event._id, registrationData);
            
            return {
              ...event,
              id: event._id,
              isRegistered: registrationData.isRegistered
            };
          })
        );

        console.log('Events with registration status:', eventsWithRegistrationStatus);
        setEvents(eventsWithRegistrationStatus);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleRegister = async (eventId: string) => {
    try {
      setRegistrationStatus(prev => ({ ...prev, [eventId]: 'loading' }));
      
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Registering for event:', eventId);

      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to register for event');
      }

      // Update the event's attendee count and registration status in the UI
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                attendees: event.attendees + 1, 
                isRegistered: true 
              }
            : event
        )
      );

      setRegistrationStatus(prev => ({ ...prev, [eventId]: 'success' }));
    } catch (error) {
      console.error('Error registering for event:', error);
      setRegistrationStatus(prev => ({ ...prev, [eventId]: 'error' }));
    }
  };

  const handleUnregister = async (eventId: string) => {
    try {
      setRegistrationStatus(prev => ({ ...prev, [eventId]: 'loading' }));
      
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Unregistering from event:', eventId);

      const response = await fetch(`/api/events/${eventId}/unregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Unregistration response:', data);

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to unregister from event');
      }

      // Update the event's attendee count and registration status in the UI
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                attendees: event.attendees - 1, 
                isRegistered: false 
              }
            : event
        )
      );

      setRegistrationStatus(prev => ({ ...prev, [eventId]: 'success' }));
    } catch (error) {
      console.error('Error unregistering from event:', error);
      setRegistrationStatus(prev => ({ ...prev, [eventId]: 'error' }));
    }
  };

  const handleViewAttendees = async (event: Event) => {
    try {
      setIsLoadingAttendees(true);
      setSelectedEvent(event);
      setIsAttendeesModalOpen(true);

      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Fetching attendees for event:', event._id);

      // Get all users and registrations
      const response = await fetch('/api/debug/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched data:', data);

      // Get event-specific registrations
      const eventRegistrations = data.eventAttendees.filter(
        (ea: any) => ea.eventId === event._id
      );
      console.log('Event registrations:', eventRegistrations);

      // Get attendee details
      const attendeeIds = eventRegistrations.map((reg: any) => reg.userId);
      console.log('Attendee IDs:', attendeeIds);

      // Find users in the data
      const attendees = data.users.filter((user: any) => 
        attendeeIds.includes(user._id)
      );
      console.log('Found attendees:', attendees);

      // If we have registrations but no attendees, clean up invalid registrations
      if (eventRegistrations.length > 0 && attendees.length === 0) {
        console.log('Cleaning up invalid registrations...');
        const cleanupResponse = await fetch(`/api/events/${event._id}/cleanup`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!cleanupResponse.ok) {
          const errorData = await cleanupResponse.json();
          console.error('Cleanup failed:', errorData);
          throw new Error(`Cleanup failed: ${errorData.error || cleanupResponse.status}`);
        }

        const cleanupData = await cleanupResponse.json();
        console.log('Cleanup result:', cleanupData);

        // Update the event's attendee count in the UI
        setEvents(prevEvents => 
          prevEvents.map(e => 
            e.id === event.id 
              ? { ...e, attendees: e.attendees - (cleanupData.debug.deletedCount || 0) }
              : e
          )
        );
      }

      // Set the attendees in state
      setAttendees(attendees.map((user: any) => ({
        _id: user._id,
        name: user.name,
        email: user.email
      })));
    } catch (error) {
      console.error('Error fetching attendees:', error);
      setAttendees([]);
    } finally {
      setIsLoadingAttendees(false);
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
        <h1 className="text-2xl font-semibold text-gray-900">Upcoming Events</h1>
        {(userRole === 'LODGE_ADMIN' || userRole === 'SUPER_ADMIN') && (
          <button
            onClick={() => router.push('/dashboard/events/manage')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Manage Events
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-blue-50 p-4">
              <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <CalendarIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Date</p>
                  <p className="text-sm text-gray-600">{formatDate(event.date)}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <ClockIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Time</p>
                  <p className="text-sm text-gray-600">{event.time}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MapPinIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{event.location}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <UserGroupIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Attendees</p>
                  <button
                    onClick={() => handleViewAttendees(event)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {event.attendees} registered
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
              
              <button
                onClick={() => event.isRegistered ? handleUnregister(event.id) : handleRegister(event.id)}
                disabled={registrationStatus[event.id] === 'loading'}
                className={`w-full py-2 px-4 rounded-md transition-colors ${
                  event.isRegistered
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : registrationStatus[event.id] === 'error'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {registrationStatus[event.id] === 'loading' ? (
                  'Processing...'
                ) : event.isRegistered ? (
                  'Unregister'
                ) : registrationStatus[event.id] === 'error' ? (
                  'Registration Failed - Try Again'
                ) : (
                  'Register to Attend'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Attendees Modal */}
      {isAttendeesModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Attendees for {selectedEvent.title}
              </h3>
              <button
                onClick={() => setIsAttendeesModalOpen(false)}
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