'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Lodge {
  _id: string;
  name: string;
  number: string;
  location: string;
  description?: string;
  logoImage?: string;
  memberCount: number;
  activeMemberCount: number;
}

export default function LodgesPage() {
  const router = useRouter();
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchLodges = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/lodges', { headers });
        
      if (!response.ok) {
        throw new Error('Failed to fetch lodges');
      }
        
      const data = await response.json();
      const lodgesData = Array.isArray(data) ? data as Lodge[] : [];
      console.log('Lodges data:', {
        totalLodges: lodgesData.length,
        lodgeDetails: lodgesData.map(lodge => ({
          name: lodge.name,
          memberCount: lodge.memberCount,
          activeMemberCount: lodge.activeMemberCount
        }))
      });
      setLodges(lodgesData);
    } catch (err) {
      console.error('Error fetching lodges:', err);
      setError('Failed to load lodges');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLodges();
  }, []);

  const filteredLodges = lodges?.filter(lodge => 
    lodge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lodge.number && lodge.number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    lodge.location.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a365d]"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h1 className="text-2xl font-bold text-[#1a365d] mb-4 text-center">Lodges</h1>
          <input
            type="text"
            placeholder="Search lodges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-[#1a365d] bg-[#f0f2f5] text-gray-900"
          />
        </div>

        {/* Lodge List */}
        <div className="space-y-4">
          {filteredLodges.map((lodge) => (
            <div
              key={lodge._id}
              onClick={async () => {
                try {
                  console.log('Navigating to lodge:', {
                    id: lodge._id,
                    name: lodge.name
                  });
                  // First try the lodge details page
                  await router.push(`/dashboard/lodges/${encodeURIComponent(lodge._id)}`);
                } catch (error) {
                  console.error('Navigation error:', error);
                  // If that fails, try the admin members page
                  await router.push(`/dashboard/lodge-admin/${encodeURIComponent(lodge._id)}/members`);
                }
              }}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {lodge.logoImage ? (
                      <div className="relative w-16 h-16">
                        <Image
                          src={lodge.logoImage}
                          alt={`${lodge.name} logo`}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-[#1a365d] rounded-lg flex items-center justify-center">
                        <span className="text-2xl font-semibold text-[#d4af37]">
                          {lodge.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-[#1a365d] truncate">
                      {lodge.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Lodge No. {lodge.number} • {lodge.location}
                    </p>
                    <div className="text-xs mt-1">
                      <span className="text-[#d4af37]">
                        {lodge.activeMemberCount || lodge.memberCount || 0} members
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredLodges.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No lodges found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
} 