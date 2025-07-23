'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewLodgeAnnouncementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    lodgeId: ''
  });

  // Set initial lodge ID
  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    console.log('Initial user data:', userData);
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('Parsed user data:', user);
        if (user.primaryLodge) {
          console.log('Setting initial lodgeId:', user.primaryLodge);
          setFormData(prev => ({
            ...prev,
            lodgeId: user.primaryLodge
          }));
        }
      } catch (err) {
        console.error('Error parsing initial user data:', err);
      }
    }
  }, []); // Empty dependency array means this runs once when component mounts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Get fresh user data
      const currentUserData = sessionStorage.getItem('user');
      console.log('Current user data before submission:', currentUserData);

      // Ensure we have a lodge ID
      let lodgeId = formData.lodgeId;
      if (!lodgeId && currentUserData) {
        try {
          const user = JSON.parse(currentUserData);
          if (user.primaryLodge) {
            lodgeId = user.primaryLodge;
            console.log('Setting lodgeId from current user data:', lodgeId);
            setFormData(prev => ({
              ...prev,
              lodgeId: lodgeId
            }));
          }
        } catch (err) {
          console.error('Error parsing user data during submission:', err);
        }
      }

      // Final check for lodge ID
      if (!lodgeId) {
        throw new Error('No lodge ID available. Please try refreshing the page.');
      }

      const submissionData = {
        ...formData,
        lodgeId: lodgeId
      };

      console.log('Submitting form data:', submissionData);

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        if (data.missingFields) {
          throw new Error(`Missing required fields: ${data.missingFields.join(', ')}`);
        }
        throw new Error(data.error || 'Failed to create announcement');
      }

      router.push('/dashboard/lodge-admin/announcements');
    } catch (err) {
      console.error('Error creating announcement:', err);
      setError(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Announcements
        </button>
        
        <h1 className="text-2xl font-semibold text-gray-900 mt-4">Create New Announcement</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl bg-white shadow rounded-lg p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Content
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={6}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              required
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Announcement'}
          </button>
        </div>
      </form>
    </div>
  );
} 