'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, User } from '@/lib/auth/client';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Form state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('english');

  useEffect(() => {
    // Get the current user from localStorage
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // In a real app, you would fetch user settings from an API here
      setLoading(false);
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would save settings to an API here
    alert('Settings saved successfully!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-masonic-blue"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-montserrat font-bold mb-2">Settings</h1>
          <p className="text-gray-600 font-montserrat">Customize your account preferences</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-masonic-blue text-white rounded hover:bg-opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-masonic-blue text-white p-4">
          <h2 className="text-xl font-montserrat font-bold">Account Settings</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSaveSettings}>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="h-4 w-4 text-masonic-blue focus:ring-masonic-blue border-gray-300 rounded"
                    />
                    <label htmlFor="emailNotifications" className="ml-2 block text-sm">
                      Email Notifications
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Language</h3>
                <div className="space-y-4">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-masonic-blue focus:border-masonic-blue sm:text-sm rounded-md"
                  >
                    <option value="english">English</option>
                    <option value="arabic">Arabic</option>
                    <option value="french">French</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-gray-300 rounded mr-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-masonic-blue text-white rounded hover:bg-opacity-90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 