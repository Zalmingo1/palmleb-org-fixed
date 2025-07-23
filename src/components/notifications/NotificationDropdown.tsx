import { useEffect, useState, useRef } from 'react';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Notification {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Optional: Poll for new notifications every 60s
    // const interval = setInterval(fetchNotifications, 60000);
    // return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || data);
    } catch {}
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map(n => n._id === id ? { ...n, read: true } : n));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b font-semibold text-gray-900">Notifications</div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 && (
              <li className="p-4 text-gray-500 text-sm text-center">No notifications</li>
            )}
            {notifications.map((n) => (
              <li key={n._id} className={`p-4 text-sm ${n.read ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">{n.title}</div>
                    <div className="text-gray-700 mt-1">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.read && (
                    <button
                      className="ml-2 p-1 rounded hover:bg-blue-100"
                      onClick={() => markAsRead(n._id)}
                      title="Mark as read"
                    >
                      <CheckIcon className="h-5 w-5 text-blue-600" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="p-2 border-t text-center">
            <a href="/dashboard/notifications" className="text-blue-600 hover:underline text-sm">View all notifications</a>
          </div>
        </div>
      )}
    </div>
  );
} 