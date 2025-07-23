'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';

interface Lodge {
  _id: string;
  name: string;
  location?: string;
}

interface LodgeSelectorProps {
  onLodgeChange: (lodgeId: string) => void;
  currentLodgeId?: string;
}

export default function LodgeSelector({ onLodgeChange, currentLodgeId }: LodgeSelectorProps) {
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentLodge, setCurrentLodge] = useState<Lodge | null>(null);

  useEffect(() => {
    const fetchUserLodges = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('/api/members/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          const userLodges = userData.lodgeRoles || {};
          
          // Get lodge details for lodges where user has admin roles
          const adminLodges: Lodge[] = [];
          for (const [lodgeId, role] of Object.entries(userLodges)) {
            // Only include lodges where user has LODGE_ADMIN role
            // (District admins can manage district lodges through district admin interface)
            if (role === 'LODGE_ADMIN') {
              // Fetch lodge details
              const lodgeResponse = await fetch(`/api/lodges/${lodgeId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (lodgeResponse.ok) {
                const lodgeData = await lodgeResponse.json();
                adminLodges.push({
                  _id: lodgeId,
                  name: lodgeData.name,
                  location: lodgeData.location
                });
              }
            }
          }
          
          setLodges(adminLodges);
          
          // Set current lodge
          if (currentLodgeId && adminLodges.find(l => l._id === currentLodgeId)) {
            setCurrentLodge(adminLodges.find(l => l._id === currentLodgeId) || null);
          } else if (adminLodges.length > 0) {
            setCurrentLodge(adminLodges[0]);
            onLodgeChange(adminLodges[0]._id);
          }
        }
      } catch (error) {
        console.error('Error fetching user lodges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLodges();
  }, [currentLodgeId, onLodgeChange]);

  if (loading) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500">
        Loading lodges...
      </div>
    );
  }

  if (lodges.length === 0) {
    return null;
  }

  if (lodges.length === 1) {
    return (
      <div className="px-3 py-2 text-sm text-gray-600 flex items-center">
        <BuildingLibraryIcon className="w-4 h-4 mr-2" />
        {currentLodge?.name || lodges[0].name}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm text-gray-600 flex items-center justify-between hover:bg-gray-100 rounded-md"
      >
        <div className="flex items-center">
          <BuildingLibraryIcon className="w-4 h-4 mr-2" />
          <span>{currentLodge?.name || 'Select Lodge'}</span>
        </div>
        <ChevronDownIcon className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          {lodges.map((lodge) => (
            <button
              key={lodge._id}
              onClick={() => {
                setCurrentLodge(lodge);
                onLodgeChange(lodge._id);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                currentLodge?._id === lodge._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">{lodge.name}</div>
              {lodge.location && (
                <div className="text-xs text-gray-500">{lodge.location}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 