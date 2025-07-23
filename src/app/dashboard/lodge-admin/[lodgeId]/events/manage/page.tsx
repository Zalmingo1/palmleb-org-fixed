'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { use } from 'react';

interface Event {
  _id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  lodgeId: string;
  createdBy?: string;
}

interface PageProps {
  params: Promise<{ lodgeId: string }>;
}

export default function LodgeEventsManagePage({ params }: PageProps) {
  const router = useRouter();
  const { lodgeId } = use(params);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    console.log('Page mounted with lodgeId:', lodgeId);
    
    // Check user role and permissions
    const userData = sessionStorage.getItem('user');
    console.log('User data from session storage:', userData);
    
    if (!userData) {
      console.log('No user data found, redirecting to login');
      router.push('/login');
      return;
    }

    const checkPermissions = async () => {
      try {
        const user = JSON.parse(userData);
        console.log('Parsed user data:', {
          user,
          role: user.role,
          normalizedRole: user.role?.toUpperCase(),
          administeredLodges: user.administeredLodges,
          primaryLodge: user.primaryLodge,
          requestedLodgeId: lodgeId
        });
        
        // Store current user ID and role for permission checks
        setCurrentUserId(user._id || user.id);
        setCurrentUserRole(user.role?.toUpperCase());
        
        // Get token to verify role
        const token = sessionStorage.getItem('token');
        if (!token) {
          console.log('No token found, redirecting to login');
          router.push('/login');
          return;
        }

        // Remove 'Bearer ' prefix if it exists
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

        // Verify token and get role
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${cleanToken}`
          }
        });

        if (!response.ok) {
          console.log('Token verification failed, redirecting to login');
          router.push('/login');
          return;
        }

        const { role: tokenRole } = await response.json();
        console.log('Token verification result:', {
          tokenRole,
          userRole: user.role,
          normalizedUserRole: user.role?.toUpperCase()
        });

        // Check if user has the correct role (from both token and user data)
        const userRole = (tokenRole || user.role)?.toUpperCase();
        if (userRole !== 'LODGE_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'DISTRICT_ADMIN') {
          console.log('Role check failed:', {
            userRole,
            tokenRole,
            userDataRole: user.role,
            requiredRoles: ['LODGE_ADMIN', 'SUPER_ADMIN', 'DISTRICT_ADMIN'],
            fullUserData: user
          });
          setError(`You do not have permission to manage events. Your current role (${userRole}) does not have the required permissions. Only Lodge Admins, District Admins, and Super Admins can manage events.`);
          setLoading(false);
          return;
        }

        // Check if user has access to this lodge
        const administeredLodges = Array.isArray(user.administeredLodges) ? user.administeredLodges : [];
        const primaryLodge = user.primaryLodge?._id || user.primaryLodge;
        
        console.log('Lodge access check details:', {
          administeredLodges,
          primaryLodge,
          requestedLodgeId: lodgeId,
          hasAdministeredLodge: administeredLodges.includes(lodgeId),
          hasPrimaryLodge: primaryLodge === lodgeId,
          primaryLodgeType: typeof user.primaryLodge,
          administeredLodgesType: typeof user.administeredLodges,
          userRole,
          tokenRole
        });

        // SUPER_ADMIN and DISTRICT_ADMIN can access all lodges
        const hasLodgeAccess = userRole === 'SUPER_ADMIN' || 
                             userRole === 'DISTRICT_ADMIN' || 
                             administeredLodges.includes(lodgeId) || 
                             primaryLodge === lodgeId;
        
        if (!hasLodgeAccess) {
          console.log('Lodge access check failed:', {
            userLodges: {
              administered: administeredLodges,
              primary: primaryLodge
            },
            requestedLodge: lodgeId,
            hasAdministeredLodge: administeredLodges.includes(lodgeId),
            hasPrimaryLodge: primaryLodge === lodgeId,
            userRole,
            tokenRole
          });
          setError(`You do not have access to manage events for this lodge. Your current role (${userRole}) requires you to be either a Lodge Admin for this lodge or have it as your primary lodge.`);
          setLoading(false);
          return;
        }

        console.log('User has required permissions, fetching events...');
        fetchEvents();
      } catch (err) {
        console.error('Error checking user permissions:', err);
        setError('Error checking user permissions. Please try logging in again.');
        setLoading(false);
      }
    };

    checkPermissions();
  }, [lodgeId, router]);

  const fetchEvents = async () => {
    try {
      console.log('Starting to fetch events...');
      setLoading(true);
      setError(null);

      let token = sessionStorage.getItem('token');
      console.log('Token from session storage:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        router.push('/login');
        return;
      }

      // Log token details (safely)
      console.log('Token details:', {
        length: token.length,
        startsWithBearer: token.startsWith('Bearer '),
        firstChars: token.substring(0, 10) + '...',
        lastChars: '...' + token.substring(token.length - 10)
      });

      // Remove 'Bearer ' prefix if it exists
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      // Log cleaned token details
      console.log('Cleaned token details:', {
        length: token.length,
        firstChars: token.substring(0, 10) + '...',
        lastChars: '...' + token.substring(token.length - 10)
      });

      console.log('Making API request to fetch events...');
      const response = await fetch(`/api/events?lodgeId=${lodgeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Token invalid, clearing session and redirecting to login');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch events');
      }

      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      console.log('Finished fetching events, setting loading to false');
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let token = sessionStorage.getItem('token');
      console.log('Token from session storage:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        router.push('/login');
        return;
      }

      // Remove 'Bearer ' prefix if it exists
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      console.log('Adding event with data:', {
        ...formData,
        lodgeId
      });

      const response = await fetch(`/api/lodges/${lodgeId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          type: 'REGULAR',
          status: 'UPCOMING'
        })
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Token invalid, clearing session and redirecting to login');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        let errorMessage = 'Failed to add event';
        if (data.error) {
          errorMessage = data.error;
          if (data.details) {
            if (data.details.userRole) {
              errorMessage += ` (User role: ${data.details.userRole})`;
            }
            if (data.details.missingFields) {
              const missingFields = Object.entries(data.details.missingFields)
                .filter(([_, isMissing]) => isMissing)
                .map(([field]) => field)
                .join(', ');
              if (missingFields) {
                errorMessage += ` - Missing fields: ${missingFields}`;
              }
            }
          }
        }
        throw new Error(errorMessage);
      }

      setShowAddModal(false);
      setFormData({
        title: '',
        date: '',
        time: '',
        location: '',
        description: ''
      });
      fetchEvents();
    } catch (err) {
      console.error('Error adding event:', err);
      setError(err instanceof Error ? err.message : 'Failed to add event');
    }
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify({
          ...formData,
          lodgeId,
          type: 'REGULAR',
          status: 'UPCOMING'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update event');
      }

      setShowEditModal(false);
      setSelectedEvent(null);
      setFormData({
        title: '',
        date: '',
        time: '',
        location: '',
        description: ''
      });
      fetchEvents();
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err instanceof Error ? err.message : 'Failed to update event');
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
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete event');
      }

      setShowDeleteModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  if (loading) {
    console.log('Rendering loading state...');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  console.log('Rendering main content with events:', events);
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        
        <div className="flex justify-between items-center mt-4">
          <h1 className="text-2xl font-semibold text-gray-900">Manage Events</h1>
          <button
            onClick={() => {
              setFormData({
                title: '',
                date: '',
                time: '',
                location: '',
                description: ''
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add New Event
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {canEditEvent(event) ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setFormData({
                              title: event.title,
                              date: event.date,
                              time: event.time,
                              location: event.location,
                              description: event.description
                            });
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">No permissions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900">Add New Event</h3>
              <form onSubmit={handleAddEvent} className="mt-4">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="time">
                    Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Add Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900">Edit Event</h3>
              <form onSubmit={handleEditEvent} className="mt-4">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="time">
                    Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900">Delete Event</h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 