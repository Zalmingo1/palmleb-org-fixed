'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface EventsManageLayoutProps {
  children: ReactNode;
}

export default function EventsManageLayout({ children }: EventsManageLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['LODGE_ADMIN', 'SUPER_ADMIN']}>
      <div className="w-full">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                You are in the events management area. Changes made here will be visible to all users.
              </p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </ProtectedRoute>
  );
} 