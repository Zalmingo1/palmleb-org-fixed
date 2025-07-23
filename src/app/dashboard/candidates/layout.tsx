'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface CandidatesLayoutProps {
  children: React.ReactNode;
}

export default function CandidatesLayout({ children }: CandidatesLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['USER', 'LODGE_ADMIN', 'SUPER_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
} 