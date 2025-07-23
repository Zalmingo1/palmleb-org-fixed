'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface DocumentsLayoutProps {
  children: React.ReactNode;
}

export default function DocumentsLayout({ children }: DocumentsLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['USER', 'LODGE_ADMIN', 'SUPER_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
} 