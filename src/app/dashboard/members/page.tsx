'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  lodges: Array<{
    id: string;
    name: string;
  }>;
  primaryLodge: {
    id: string;
    name: string;
  } | null;
  primaryLodgePosition: string;
  administeredLodges: string[];
  created: Date;
  lastLogin?: Date;
  status: 'active' | 'inactive' | 'pending';
  profileImage?: string;
  memberSince: string;
  occupation?: string;
}

export default function MembersDirectory() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get token and user data from sessionStorage
        const token = sessionStorage.getItem('token');
        const userData = sessionStorage.getItem('user');
        const userRole = sessionStorage.getItem('userRole');

        // Check if user is a lodge admin
        const isLodgeAdmin = userRole === 'LODGE_ADMIN';
        let administeredLodges: string[] = [];
        
        if (isLodgeAdmin && userData) {
          const parsedUser = JSON.parse(userData);
          administeredLodges = parsedUser.administeredLodges || [];
        }

        // Construct the API URL with query parameters for lodge admins
        let apiUrl = '/api/members';
        if (isLodgeAdmin && administeredLodges.length > 0) {
          const lodgeIds = administeredLodges.join(',');
          apiUrl = `/api/members?lodges=${lodgeIds}`;
        }

        const response = await fetch(apiUrl, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format: expected an array of members');
        }
        
        // Transform the data to match our interface
        const transformedMembers = data.map((member: any) => ({
          _id: member._id,
          name: member.name || '',
          email: member.email || '',
          role: member.role || 'LODGE_MEMBER',
          lodges: member.lodges || [],
          primaryLodge: member.primaryLodge ? {
            id: member.primaryLodge,
            name: member.lodge?.name || 'Unknown Lodge'
          } : null,
          primaryLodgePosition: member.primaryLodgePosition || 'MEMBER',
          administeredLodges: member.administeredLodges || [],
          created: member.created || new Date(),
          lastLogin: member.lastLogin,
          status: member.status || 'active',
          profileImage: member.profileImage || '/images/default-avatar.png',
          memberSince: member.memberSince || new Date().toISOString(),
          occupation: member.occupation || '',
        }));
        
        setMembers(transformedMembers);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Failed to load members. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchMembers();
  }, [router]);

  const filteredMembers = members.filter(member => {
    const searchLower = debouncedSearchQuery.toLowerCase();
    
    return (
      member.name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      (member.primaryLodge?.name || '').toLowerCase().includes(searchLower) ||
      (member.primaryLodgePosition || '').toLowerCase().includes(searchLower) ||
      (member.occupation || '').toLowerCase().includes(searchLower) ||
      (member.lodges && member.lodges.some(lodge => 
        lodge.name?.toLowerCase().includes(searchLower)
      ))
    );
  });

  // Add search results count
  const searchResultsCount = filteredMembers.length;
  const totalMembers = members.length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Members Directory</h1>
        <div className="relative w-[600px]">
          <input
            type="text"
            placeholder="Search members by name, email, lodge, or position..."
            className="w-full px-8 py-2 pl-14 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 absolute left-5 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>
      
      {debouncedSearchQuery && (
        <div className="mb-4 text-sm text-gray-600">
          Found {searchResultsCount} of {totalMembers} members
        </div>
      )}
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
          <div className="col-span-4">Member</div>
          <div className="col-span-3">Position</div>
          <div className="col-span-3">Primary Lodge</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredMembers.map((member) => {
            console.log('Rendering member:', {
              id: member._id,
              name: member.name,
              email: member.email
            });
            return (
              <Link 
                href={`/dashboard/members/${member._id}`} 
                key={member._id}
                className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="col-span-4 flex items-center space-x-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                    {member.profileImage ? (
                      <img
                        src={member.profileImage}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <UserCircleIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {member.email}
                    </p>
                  </div>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {member.primaryLodgePosition || 'No Position'}
                    </p>
                    {member.lodges && member.lodges.length > 1 && (
                      <p className="text-xs text-gray-500">
                        {member.lodges.length} lodges
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <p className="text-sm text-gray-900 truncate">
                    {member.primaryLodge?.name || 'No Primary Lodge'}
                  </p>
                </div>
                
                <div className="col-span-2 flex items-center justify-end">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <UserCircleIcon className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500">No members found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
} 