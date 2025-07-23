"use client";
import { useEffect, useState } from 'react';
import { CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Notification {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: string;
  fromUserName: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  // Optional: Delete notification
  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    setNotifications((prev) => prev.filter(n => n._id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
      {loading ? (
        <div className="flex justify-center items-center min-h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-900"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-gray-500">No notifications found.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {notifications.map((n) => (
            <li key={n._id} className={`flex items-center justify-between p-4 ${n.read ? 'bg-gray-50' : 'bg-white'}`}>
              <div>
                <div className="font-medium text-gray-900">{n.title}</div>
                <div className="text-gray-700 mt-1">
                  {n.type === 'comment' 
                    ? `${n.fromUserName} commented on your post`
                    : n.message}
                </div>
                <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center space-x-2">
                {!n.read && (
                  <button
                    className="p-2 rounded hover:bg-blue-100"
                    onClick={() => markAsRead(n._id)}
                    title="Mark as read"
                  >
                    <CheckIcon className="h-5 w-5 text-blue-600" />
                  </button>
                )}
                <button
                  className="p-2 rounded hover:bg-red-100"
                  onClick={() => deleteNotification(n._id)}
                  title="Delete notification"
                >
                  <TrashIcon className="h-5 w-5 text-red-600" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 