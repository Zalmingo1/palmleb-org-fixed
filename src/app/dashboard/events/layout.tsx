'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface EventsLayoutProps {
  children: ReactNode;
}

export default function EventsLayout({ children }: EventsLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['USER', 'LODGE_ADMIN', 'SUPER_ADMIN']}>
      <div className="w-full">
        {children}
      </div>
    </ProtectedRoute>
  );
} 