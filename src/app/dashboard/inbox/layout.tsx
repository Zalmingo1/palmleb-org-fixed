'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface InboxLayoutProps {
  children: React.ReactNode;
}

export default function InboxLayout({ children }: InboxLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['USER', 'LODGE_ADMIN', 'SUPER_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
} 