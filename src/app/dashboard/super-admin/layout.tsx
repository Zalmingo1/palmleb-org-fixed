'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="SUPER_ADMIN">
      <div className="w-full">
        {children}
      </div>
    </ProtectedRoute>
  );
} 