'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlusIcon, TrashIcon, ExclamationCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
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

interface Lodge {
  _id: string;
  name: string;
}

export default function CandidatesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  useEffect(() => {
    // Check if user is authenticated using sessionStorage
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const role = sessionStorage.getItem('userRole');
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setUserRole(role);
    fetchCandidates();
    fetchLodges();
  }, [router]);

  const fetchCandidates = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/candidates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const data = await response.json();
      console.log('Fetched candidates with images:', data.map((c: Candidate) => ({
        name: `${c.firstName} ${c.lastName}`,
        imageUrl: c.idPhotoUrl
      })));
      setCandidates(data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLodges = async () => {
    try {
      const response = await fetch('/api/lodges');
      if (!response.ok) throw new Error('Failed to fetch lodges');
      const data = await response.json();
      setLodges(data);
    } catch (error) {
      console.error('Error fetching lodges:', error);
    }
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleEditCandidate = async (candidate: Candidate) => {
    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidate),
      });

      if (!response.ok) throw new Error('Failed to update candidate');

      const updatedCandidate = await response.json();
      setCandidates(candidates.map(c => 
        c._id === updatedCandidate._id ? updatedCandidate : c
      ));
      setShowEditModal(false);
      setEditingCandidate(null);
    } catch (error) {
      console.error('Error updating candidate:', error);
    }
  };

  const handleDeleteCandidate = async (candidate: Candidate) => {
    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete candidate');

      setCandidates(candidates.filter(c => c._id !== candidate._id));
      setShowDeleteModal(false);
      setCandidateToDelete(null);
    } catch (error) {
      console.error('Error deleting candidate:', error);
    }
  };

  const isAdmin = userRole === 'LODGE_ADMIN' || userRole === 'SUPER_ADMIN';

  const getLodgeName = (lodgeId: string) => {
    return lodgeId || 'Unknown Lodge';
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Candidates</h1>
        <p className="text-gray-600">
          {isAdmin 
            ? 'Review and manage candidates for membership. Candidates are automatically removed after 20 days.' 
            : 'View current candidates for membership. Candidates are displayed for 20 days.'}
        </p>
      </div>

      {/* Candidates list */}
      {candidates.length === 0 ? (
        <div className="text-center py-12">
          <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin 
              ? 'Add new candidates to get started.' 
              : 'Check back later for new candidates.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {candidates.map((candidate) => (
              <li key={candidate._id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16 relative">
                      {candidate.idPhotoUrl && candidate.idPhotoUrl.startsWith('data:image') ? (
                        <img
                          src={candidate.idPhotoUrl}
                          alt={`${candidate.firstName} ${candidate.lastName}'s profile`}
                          className="rounded-md object-cover w-full h-full"
                          onError={(e) => {
                            console.error('Error loading image for candidate:', candidate.firstName, candidate.lastName);
                            e.currentTarget.src = '/default-avatar.png';
                          }}
                        />
                      ) : (
                        <Image
                          src="/default-avatar.png"
                          alt={`${candidate.firstName} ${candidate.lastName}'s profile`}
                          className="rounded-md object-cover"
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">{candidate.firstName} {candidate.lastName}</h3>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        <p>Parent Lodge: {getLodgeName(candidate.lodge)}</p>
                        <p>Lives In: {candidate.livingLocation}</p>
                        <p>Date of Birth: {formatDate(candidate.dateOfBirth)}</p>
                        <p>Profession: {candidate.profession}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {isAdmin && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingCandidate(candidate);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setCandidateToDelete(candidate);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                    <div className={`mt-2 flex items-center ${candidate.daysLeft <= 5 ? 'text-red-600' : 'text-gray-500'}`}>
                      {candidate.daysLeft > 0 ? (
                        <>
                          {candidate.daysLeft <= 5 && <ExclamationCircleIcon className="h-5 w-5 mr-1" />}
                          <span className="text-sm font-medium">
                            {candidate.daysLeft} {candidate.daysLeft === 1 ? 'day' : 'days'} left
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-red-600">Expired</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Notes:</p>
                    <p className="mt-1">{candidate.notes}</p>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Submitted on {formatDate(candidate.submissionDate)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCandidate && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-medium mb-4">Edit Candidate</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleEditCandidate(editingCandidate);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={editingCandidate.firstName}
                    onChange={(e) => setEditingCandidate({...editingCandidate, firstName: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={editingCandidate.lastName}
                    onChange={(e) => setEditingCandidate({...editingCandidate, lastName: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    value={editingCandidate.dateOfBirth}
                    onChange={(e) => setEditingCandidate({...editingCandidate, dateOfBirth: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Living Location</label>
                  <input
                    type="text"
                    value={editingCandidate.livingLocation}
                    onChange={(e) => setEditingCandidate({...editingCandidate, livingLocation: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profession</label>
                  <input
                    type="text"
                    value={editingCandidate.profession}
                    onChange={(e) => setEditingCandidate({...editingCandidate, profession: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={editingCandidate.notes}
                    onChange={(e) => setEditingCandidate({...editingCandidate, notes: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCandidate(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && candidateToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-medium mb-4">Delete Candidate</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {candidateToDelete.firstName} {candidateToDelete.lastName}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCandidateToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCandidate(candidateToDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 