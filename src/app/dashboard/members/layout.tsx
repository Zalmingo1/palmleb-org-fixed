'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface MembersLayoutProps {
  children: ReactNode;
}

export default function MembersLayout({ children }: MembersLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </ProtectedRoute>
  );
} 