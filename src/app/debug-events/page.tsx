'use client';

import { useState, useEffect } from 'react';

export default function DebugEventsPage() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          setError('No token found');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/debug/events', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setDebugData(data);
      } catch (err) {
        console.error('Error fetching debug data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDebugData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading debug data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-medium text-red-800">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Events Debug Information</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
          {debugData?.user ? (
            <div className="space-y-2">
              <p><strong>Name:</strong> {debugData.user.name}</p>
              <p><strong>ID:</strong> {debugData.user._id}</p>
              <p><strong>Role:</strong> {debugData.user.role}</p>
              <p><strong>Primary Lodge:</strong> {debugData.user.primaryLodge}</p>
              <p><strong>Administered Lodges:</strong> {debugData.user.administeredLodges?.join(', ') || 'None'}</p>
            </div>
          ) : (
            <p className="text-gray-500">No user data found</p>
          )}
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
          <div className="space-y-2">
            <p><strong>Current Date:</strong> {debugData?.currentDate}</p>
            <p><strong>Today Start:</strong> {new Date(debugData?.todayStart).toISOString()}</p>
          </div>
        </div>
      </div>

      {/* All Events */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          All Events in Database ({debugData?.allEvents?.length || 0})
        </h2>
        
        {debugData?.allEvents && debugData.allEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lodge ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District Wide</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {debugData.allEvents.map((event: any) => (
                  <tr key={event._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.lodgeId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.isDistrictWide ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No events found in database</p>
        )}
      </div>

      {/* Test Events API */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Events API</h2>
        <div className="space-y-4">
          <button
            onClick={async () => {
              try {
                const token = sessionStorage.getItem('token');
                const userData = sessionStorage.getItem('user');
                const user = userData ? JSON.parse(userData) : null;
                const lodgeId = user?.primaryLodge?._id || user?.primaryLodge;
                
                if (!lodgeId) {
                  alert('No lodge ID found in user data');
                  return;
                }

                const response = await fetch(`/api/events?lodgeId=${lodgeId}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });

                const data = await response.json();
                console.log('Events API response:', data);
                alert(`Events API returned ${data.length || 0} events. Check console for details.`);
              } catch (err) {
                console.error('Error testing events API:', err);
                alert('Error testing events API. Check console for details.');
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Test Events API
          </button>
        </div>
      </div>
    </div>
  );
} 