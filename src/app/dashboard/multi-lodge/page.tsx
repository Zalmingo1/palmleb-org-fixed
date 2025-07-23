'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LodgeSelector from '@/components/dashboard/LodgeSelector';
import {
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  Cog6ToothIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface Lodge {
  _id: string;
  name: string;
  location?: string;
  memberCount?: number;
  eventCount?: number;
}

interface LodgeStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  totalEvents: number;
  upcomingEvents: number;
}

export default function MultiLodgeDashboard() {
  const router = useRouter();
  const [currentLodgeId, setCurrentLodgeId] = useState<string>('');
  const [currentLodge, setCurrentLodge] = useState<Lodge | null>(null);
  const [lodgeStats, setLodgeStats] = useState<LodgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentLodgeId) {
      fetchLodgeStats(currentLodgeId);
    }
  }, [currentLodgeId]);

  const fetchLodgeStats = async (lodgeId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Fetch lodge details
      const lodgeResponse = await fetch(`/api/lodges/${lodgeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (lodgeResponse.ok) {
        const lodgeData = await lodgeResponse.json();
        setCurrentLodge(lodgeData);
      }

      // Fetch lodge statistics
      const statsResponse = await fetch(`/api/lodges/${lodgeId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setLodgeStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching lodge stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLodgeChange = (lodgeId: string) => {
    setCurrentLodgeId(lodgeId);
  };

  const navigateToLodgeSection = (section: string) => {
    if (currentLodgeId) {
      router.push(`/dashboard/lodge-admin/${currentLodgeId}/${section}`);
    }
  };

  if (!currentLodgeId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Multi-Lodge Dashboard</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select a Lodge to Manage</h2>
            <LodgeSelector onLodgeChange={handleLodgeChange} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Multi-Lodge Dashboard</h1>
              <p className="text-gray-600">Manage multiple lodges from one interface</p>
            </div>
            <LodgeSelector onLodgeChange={handleLodgeChange} currentLodgeId={currentLodgeId} />
          </div>
        </div>

        {currentLodge && (
          <>
            {/* Lodge Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{currentLodge.name}</h2>
                  {currentLodge.location && (
                    <p className="text-gray-600">{currentLodge.location}</p>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigateToLodgeSection('members')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Manage Members
                  </button>
                  <button
                    onClick={() => navigateToLodgeSection('events')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Manage Events
                  </button>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {lodgeStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Members</p>
                      <p className="text-2xl font-semibold text-gray-900">{lodgeStats.totalMembers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Members</p>
                      <p className="text-2xl font-semibold text-gray-900">{lodgeStats.activeMembers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <CalendarIcon className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Events</p>
                      <p className="text-2xl font-semibold text-gray-900">{lodgeStats.totalEvents}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <CalendarIcon className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                      <p className="text-2xl font-semibold text-gray-900">{lodgeStats.upcomingEvents}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  <h3 className="ml-2 text-lg font-medium text-gray-900">Members</h3>
                </div>
                <p className="text-gray-600 mb-4">Manage lodge members, view profiles, and handle applications.</p>
                <button
                  onClick={() => navigateToLodgeSection('members')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Manage Members
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <CalendarIcon className="h-6 w-6 text-green-600" />
                  <h3 className="ml-2 text-lg font-medium text-gray-900">Events</h3>
                </div>
                <p className="text-gray-600 mb-4">Create and manage lodge events, meetings, and activities.</p>
                <button
                  onClick={() => navigateToLodgeSection('events')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Manage Events
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                  <h3 className="ml-2 text-lg font-medium text-gray-900">Documents</h3>
                </div>
                <p className="text-gray-600 mb-4">Upload and manage lodge documents and resources.</p>
                <button
                  onClick={() => navigateToLodgeSection('documents')}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Manage Documents
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <ChartBarIcon className="h-6 w-6 text-orange-600" />
                  <h3 className="ml-2 text-lg font-medium text-gray-900">Analytics</h3>
                </div>
                <p className="text-gray-600 mb-4">View lodge statistics and performance metrics.</p>
                <button
                  onClick={() => navigateToLodgeSection('analytics')}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  View Analytics
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <BuildingLibraryIcon className="h-6 w-6 text-indigo-600" />
                  <h3 className="ml-2 text-lg font-medium text-gray-900">Lodge Settings</h3>
                </div>
                <p className="text-gray-600 mb-4">Configure lodge settings and preferences.</p>
                <button
                  onClick={() => navigateToLodgeSection('settings')}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Lodge Settings
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Cog6ToothIcon className="h-6 w-6 text-gray-600" />
                  <h3 className="ml-2 text-lg font-medium text-gray-900">Administration</h3>
                </div>
                <p className="text-gray-600 mb-4">Advanced administrative functions and tools.</p>
                <button
                  onClick={() => navigateToLodgeSection('admin')}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Administration
                </button>
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
} 