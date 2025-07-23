'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface User {
  id?: string;
  name: string;
  email: string;
  role?: string;
  lodgeId?: string;
  lodge?: {
    name: string;
  };
}

interface Candidate {
  id: string;
  name: string;
  lodge: string;
  sponsor: string;
  daysLeft: number;
  status: 'pending' | 'approved' | 'rejected' | 'on_hold';
  email: string;
  applicationDate: string;
  profileImage?: string;
}

// Candidate card component - enhanced version
const CandidateCard = ({ 
  name, 
  lodge, 
  sponsor, 
  daysLeft, 
  status = 'pending',
  email,
  applicationDate
}: Candidate) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 last:mb-0 transition-all duration-200 hover:shadow-md">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center">
        <div className="h-10 w-10 bg-[#1c3c6d] rounded-full flex items-center justify-center text-white font-medium mr-3">
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
        status === 'approved' ? 'bg-green-50 text-green-600' : 
        status === 'rejected' ? 'bg-red-50 text-red-600' :
        status === 'on_hold' ? 'bg-amber-50 text-amber-600' :
        daysLeft < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
      }`}>
        {status === 'pending' ? `${daysLeft} days left` : status.replace('_', ' ')}
      </span>
    </div>
    
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div>
        <p className="text-xs text-gray-500">Lodge</p>
        <p className="text-sm text-gray-700">{lodge}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Sponsor</p>
        <p className="text-sm text-gray-700">{sponsor}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Application Date</p>
        <p className="text-sm text-gray-700">{applicationDate}</p>
      </div>
    </div>
  </div>
);

// Header back button component
const BackButton = () => (
  <Link href="/dashboard" className="inline-flex items-center text-sm text-[#1c3c6d] hover:text-[#1c3c6d]/80">
    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
    Back to Dashboard
  </Link>
);

export default function CandidatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  
  // Mock candidates data
  const [candidates, setCandidates] = useState<Candidate[]>([
    {
      id: '1',
      name: 'Robert Johnson',
      lodge: 'Palm Beach Lodge',
      sponsor: 'William Smith',
      daysLeft: 21,
      status: 'pending',
      email: 'robert.johnson@example.com',
      applicationDate: 'May 1, 2023'
    },
    {
      id: '2',
      name: 'Michael Williams',
      lodge: 'Palm Beach Lodge',
      sponsor: 'James Brown',
      daysLeft: 7,
      status: 'pending',
      email: 'michael.williams@example.com',
      applicationDate: 'May 5, 2023'
    },
    {
      id: '3',
      name: 'David Miller',
      lodge: 'Palm Beach Lodge',
      sponsor: 'Thomas Davis',
      daysLeft: 0,
      status: 'approved',
      email: 'david.miller@example.com',
      applicationDate: 'April 12, 2023'
    },
    {
      id: '4',
      name: 'John Anderson',
      lodge: 'Palm Beach Lodge',
      sponsor: 'Richard Wilson',
      daysLeft: 0,
      status: 'rejected',
      email: 'john.anderson@example.com',
      applicationDate: 'April 8, 2023'
    },
    {
      id: '5',
      name: 'Paul Martinez',
      lodge: 'Palm Beach Lodge',
      sponsor: 'Mark Taylor',
      daysLeft: 0,
      status: 'on_hold',
      email: 'paul.martinez@example.com',
      applicationDate: 'April 22, 2023'
    }
  ]);
  
  // Authentication check
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          setLoading(false);
          setAuthError('Your session has expired. Please log in again.');
          return false;
        }
        
        const data = await response.json();
        setLoading(false);
        setUser(data.user);
        return true;
      } catch (error) {
        console.error('Error verifying authentication:', error);
        setLoading(false);
        setAuthError('Could not verify authentication status. Please try again.');
        return false;
      }
    };
    
    verifyAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur supports-backdrop-blur:bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Image
                  src="/logo.png"
                  alt="PalmLeb"
                  width={36}
                  height={36}
                  className="h-9 w-auto"
                />
                <span className="ml-2 text-xl font-semibold text-gray-900">PalmLeb</span>
              </div>
            </div>
            
            <div className="flex items-center">
              {user && (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      router.push('/login');
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      ) : authError ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-red-700">
            {authError}
          </div>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <BackButton />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Candidates</h1>
            </div>
          </div>
          
          {/* Candidates List */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">All Candidates</h2>
              <span className="text-sm text-gray-500">{candidates.length} candidates</span>
            </div>
            
            <div className="p-5 space-y-4">
              {candidates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No candidates found</p>
                </div>
              ) : (
                candidates.map(candidate => (
                  <CandidateCard
                    key={candidate.id}
                    {...candidate}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
} 