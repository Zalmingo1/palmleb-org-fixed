'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Candidate {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  lodge: string;
  livingLocation: string;
  profession: string;
  submittedBy: string;
  submissionDate: string;
  status: 'pending' | 'approved' | 'rejected';
  idPhotoUrl: string;
  notes: string;
  daysLeft: number;
  timing: {
    startDate: string;
    endDate: string;
  };
}

export default function UserWallPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
    // Update candidates every minute to refresh countdown
    const interval = setInterval(fetchCandidates, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/candidates', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const data = await response.json();
      
      // Filter out candidates that have expired
      const currentDate = new Date();
      const activeCandidates = data.filter((candidate: Candidate) => {
        const endDate = new Date(candidate.timing.endDate);
        return endDate > currentDate;
      });
      
      setCandidates(activeCandidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Candidate Wall</h1>
        <p className="text-gray-900">
          View and support new candidates for membership. Each candidate will be displayed for 20 days.
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No active candidates</h3>
          <p className="mt-1 text-sm text-gray-900">
            Check back later for new candidates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <div key={candidate._id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-16 w-16 relative">
                    <Image
                      src={candidate.idPhotoUrl}
                      alt={`${candidate.firstName} ${candidate.lastName}'s ID photo`}
                      className="rounded-md object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    <p className="text-sm text-gray-900">
                      {candidate.profession} • {candidate.livingLocation}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">Days Remaining:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {candidate.daysLeft} days
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                          width: `${(candidate.daysLeft / 20) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Lodge:</span> {candidate.lodge}
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Date of Birth:</span> {new Date(candidate.dateOfBirth).toLocaleDateString()}
                  </p>
                  {candidate.notes && (
                    <p className="mt-2 text-sm text-gray-900">
                      <span className="font-medium">Notes:</span> {candidate.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 text-xs text-gray-900">
                  <p>Submitted by {candidate.submittedBy}</p>
                  <p>on {new Date(candidate.submissionDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 