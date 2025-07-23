'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth/client';

interface NotificationBadgeProps {
  route: string;
}

export default function NotificationBadge({ route }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        if (route === '/dashboard/inbox') {
          const response = await fetch('/api/messages', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            console.error('Failed to fetch messages');
            return;
          }

          const data = await response.json();
          if (data.messages) {
            const unreadMessages = data.messages.filter(
              (message: any) => !message.isRead && message.recipientId === getCurrentUser()?.id
            );
            setUnreadCount(unreadMessages.length);
          }
        } else if (route === '/dashboard/news') {
          const response = await fetch('/api/notifications', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            console.error('Failed to fetch notifications');
            return;
          }

          const data = await response.json();
          if (data.notifications) {
            const unreadNews = data.notifications.filter(
              (notification: any) => !notification.read && notification.type === 'news'
            );
            setUnreadCount(unreadNews.length);
          }
        } else if (route === '/dashboard/candidates') {
          const response = await fetch('/api/candidates', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            console.error('Failed to fetch candidates');
            return;
          }

          const data = await response.json();
          const pendingCandidates = data.filter(
            (candidate: any) => candidate.status === 'pending'
          );
          setUnreadCount(pendingCandidates.length);
        }
      } catch (error) {
        console.error('Error fetching count:', error);
      }
    };

    fetchCount();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [route]);

  if (unreadCount === 0) return null;

  return (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-masonic-gold text-masonic-blue text-xs font-bold ml-2">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
} 