'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Announcement {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  lodgeId: string;
}

export default function SuperAdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/announcements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }

      const data = await response.json();
      setAnnouncements(data);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      setAnnouncements(prev => prev.filter(a => a._id !== id));
      setShowDeleteModal(false);
      setAnnouncementToDelete(null);
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Announcements</h1>
          <p className="text-gray-600 mt-2">Manage announcements that will be visible to all members across the system.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/super-admin/announcements/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Announcement
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No announcements found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {announcements.map((announcement) => (
              <li key={announcement._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {announcement.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      Posted on {new Date(announcement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => router.push(`/dashboard/super-admin/announcements/${announcement._id}/edit`)}
                      className="p-2 text-purple-600 hover:text-purple-800"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setAnnouncementToDelete(announcement._id);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && announcementToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Announcement</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAnnouncementToDelete(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(announcementToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 