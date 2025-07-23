'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';

interface Notification {
  _id: string;
  type: 'like' | 'comment' | 'message';
  postId?: string;
  messageId?: string;
  fromUserId: string;
  fromUserName: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setNotifications([]);
        return;
      }

      // Use relative URL to ensure it goes to the correct port
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Notifications API error:', response.status, response.statusText);
        setNotifications([]);
        return;
      }

      const data = await response.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : Array.isArray(data) ? data : []);
      setUnreadCount(data.unreadCount || (Array.isArray(data) ? data.filter(n => !n.read).length : 0));
    } catch (error) {
      setNotifications([]);
      // Only log the error if it's not a connection refused error
      if (error instanceof Error && !error.message?.includes('ERR_CONNECTION_REFUSED')) {
        console.error('Error fetching notifications:', error);
      }
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to mark notification as read';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true } 
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await markAsRead(notification._id);

    // Navigate based on notification type
    if (notification.type === 'message' && notification.fromUserId) {
      router.push(`/dashboard/inbox?contactId=${notification.fromUserId}`);
    } else if (notification.type === 'comment' && notification.postId) {
      router.push(`/dashboard/posts/${notification.postId}`);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700"
      >
        {unreadCount > 0 ? (
          <>
            <BellIconSolid className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          </>
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
            {Array.isArray(notifications) && notifications.length === 0 ? (
              <p className="text-gray-500 text-center">No notifications</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Array.isArray(notifications) && notifications.map(notification => (
                  <div
                    key={notification._id}
                    className={`p-3 rounded-lg cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : 'bg-white'
                    } hover:bg-gray-50`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <p className="text-sm text-gray-900">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 