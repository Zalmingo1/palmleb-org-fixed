'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { use } from 'react';
import { refreshToken } from '@/lib/auth/client';

interface Candidate {
  _id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
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
  lodgeId: string;
  lodge?: {
    _id: string;
    name: string;
  };
}

export default function LodgeCandidatesPage({ params }: { params: Promise<{ lodgeId: string }> }) {
  const router = useRouter();
  const { lodgeId } = use(params);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState<Candidate>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    livingLocation: '',
    profession: '',
    notes: '',
    status: 'pending',
    submittedBy: '',
    submissionDate: new Date().toISOString(),
    idPhotoUrl: '',
    daysLeft: 20,
    timing: {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    lodgeId: lodgeId
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [lodgeName, setLodgeName] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [lodgeId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = sessionStorage.getItem('token');
      const userData = sessionStorage.getItem('user');
      
      if (!token || !userData) {
        router.push('/login');
        return;
      }

      // Verify user is a lodge admin for this lodge
      const user = JSON.parse(userData);
      const administeredLodges = user.administeredLodges || [];
      const primaryLodgeId = typeof user.primaryLodge === 'string' ? user.primaryLodge : user.primaryLodge?._id;
      
      if (!administeredLodges.includes(lodgeId) && primaryLodgeId !== lodgeId) {
        router.push('/dashboard/lodge-admin');
        return;
      }

      // Fetch lodge details
      const lodgeResponse = await fetch(`/api/lodges/${lodgeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (lodgeResponse.ok) {
        const lodgeData = await lodgeResponse.json();
        setLodgeName(lodgeData.name);
      }

      // Fetch all candidates
      const candidatesResponse = await fetch('/api/candidates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (candidatesResponse.ok) {
        const data = await candidatesResponse.json();
        setCandidates(data);
        setFilteredCandidates(data);
      } else {
        throw new Error('Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = candidates.filter(candidate => 
      candidate.firstName.toLowerCase().includes(query) ||
      candidate.lastName.toLowerCase().includes(query) ||
      candidate.profession.toLowerCase().includes(query) ||
      candidate.livingLocation.toLowerCase().includes(query)
    );
    setFilteredCandidates(filtered);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let idPhotoUrl = '/default-avatar.png';

      if (selectedFile) {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        idPhotoUrl = await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String);
          };
        });
      }

      // Get user data to verify role and lodge
      const userData = sessionStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found');
      }

      const user = JSON.parse(userData);
      console.log('User data from session storage:', user);

      // Get the user's lodge ID
      const userLodgeId = typeof user.primaryLodge === 'string' ? user.primaryLodge : user.primaryLodge?._id;
      console.log('User lodge ID:', userLodgeId);

      if (!userLodgeId) {
        throw new Error('User is not associated with any lodge');
      }

      const candidateData = {
        ...newCandidate,
        idPhotoUrl,
        lodgeId: userLodgeId // Ensure lodgeId is set from the user's primary lodge
      };

      console.log('Creating candidate with data:', candidateData);

      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(candidateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add candidate');
      }

      await fetchData();
      setShowAddModal(false);
      setNewCandidate({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        livingLocation: '',
        profession: '',
        notes: '',
        status: 'pending',
        submittedBy: '',
        submissionDate: new Date().toISOString(),
        idPhotoUrl: '',
        daysLeft: 20,
        timing: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        lodgeId: userLodgeId // Ensure lodgeId is set in the new candidate state
      });
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error adding candidate:', error);
      alert(error instanceof Error ? error.message : 'Failed to add candidate');
    }
  };

  const handleEditCandidate = async (candidate: Candidate) => {
    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
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

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get user data to verify role
      const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (!userData || !userData.role) {
        throw new Error('User data not found');
      }

      // Ensure role is uppercase
      const userRole = typeof userData.role === 'string' ? userData.role.toUpperCase() : userData.role;

      // Check if user has required role
      const isAllowedRole = userRole === 'SUPER_ADMIN' || userRole === 'LODGE_ADMIN';
      if (!isAllowedRole) {
        // Try to refresh the token to get updated role
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          throw new Error('Insufficient permissions - Only super admins and lodge admins can delete candidates');
        }
        
        // Get updated user data after refresh
        const updatedUserData = JSON.parse(sessionStorage.getItem('user') || '{}');
        const updatedRole = typeof updatedUserData.role === 'string' ? updatedUserData.role.toUpperCase() : updatedUserData.role;
        
        if (updatedRole !== 'SUPER_ADMIN' && updatedRole !== 'LODGE_ADMIN') {
          throw new Error('Insufficient permissions - Only super admins and lodge admins can delete candidates');
        }
      }

      // For LODGE_ADMIN, verify they are deleting a candidate from their own lodge
      if (userRole === 'LODGE_ADMIN') {
        // Get the user's lodge IDs
        const userLodgeIds = new Set<string>();
        
        // Add primary lodge ID
        if (userData.primaryLodge) {
          const primaryLodgeId = typeof userData.primaryLodge === 'string' 
            ? userData.primaryLodge 
            : userData.primaryLodge._id;
          userLodgeIds.add(primaryLodgeId.toString());
        }
        
        // Add administered lodges IDs
        if (userData.administeredLodges && Array.isArray(userData.administeredLodges)) {
          userData.administeredLodges.forEach((lodgeId: string) => {
            userLodgeIds.add(lodgeId.toString());
          });
        }

        // Add all lodges the user is a member of
        if (userData.lodges && Array.isArray(userData.lodges)) {
          userData.lodges.forEach((lodgeId: string) => {
            userLodgeIds.add(lodgeId.toString());
          });
        }

        // Verify the user has access to this lodge
        if (!userLodgeIds.has(lodgeId)) {
          throw new Error('Unauthorized - You do not have access to this lodge');
        }
      }

      // Get the latest token (in case it was refreshed)
      const currentToken = sessionStorage.getItem('token');
      if (!currentToken) {
        throw new Error('No authentication token found');
      }

      // Proceed with deletion
      const deleteResponse = await fetch(`/api/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await deleteResponse.json();

      if (!deleteResponse.ok) {
        if (deleteResponse.status === 401) {
          // Try to refresh token and retry once
          const refreshSuccess = await refreshToken();
          if (refreshSuccess) {
            const newToken = sessionStorage.getItem('token');
            const retryResponse = await fetch(`/api/candidates/${candidateId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!retryResponse.ok) {
              throw new Error('Failed to delete candidate after token refresh');
            }
          } else {
            throw new Error('Authentication failed and token refresh unsuccessful');
          }
        } else {
          throw new Error(responseData.error || 'Failed to delete candidate');
        }
      }

      // Refresh the candidates list
      await fetchData();
      setShowDeleteModal(false);
      setCandidateToDelete(null);
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete candidate');
    }
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Manage Candidates</h1>
        <p className="text-gray-900">
          Add, edit, and manage candidates for {lodgeName}. Set their timing and monitor their status.
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Candidate
        </button>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12">
          <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates found</h3>
          <p className="mt-1 text-sm text-gray-900">
            Try adjusting your search terms or add new candidates.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredCandidates.map((candidate) => (
              <li key={candidate._id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16 relative">
                      {candidate.idPhotoUrl ? (
                        <img
                          src={candidate.idPhotoUrl}
                          alt={`${candidate.firstName} ${candidate.lastName}'s profile`}
                          className="rounded-md object-cover w-full h-full"
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
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          candidate.status === 'approved' ? 'bg-green-100 text-green-800' :
                          candidate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        <p>Profession: {candidate.profession}</p>
                        <p>Location: {candidate.livingLocation}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
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
                {candidate.notes && (
                  <div className="mt-2 text-sm text-gray-900">
                    <p className="font-medium">Notes:</p>
                    <p className="mt-1">{candidate.notes}</p>
                  </div>
                )}
                <div className="mt-2 text-sm text-gray-900">
                  <p>Submitted by {candidate.submittedBy} on {new Date(candidate.submissionDate).toLocaleDateString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-lg font-medium mb-4 text-gray-900">Add New Candidate</h2>
            <form onSubmit={handleAddCandidate}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">First Name</label>
                  <input
                    type="text"
                    value={newCandidate.firstName}
                    onChange={(e) => setNewCandidate({ ...newCandidate, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Last Name</label>
                  <input
                    type="text"
                    value={newCandidate.lastName}
                    onChange={(e) => setNewCandidate({ ...newCandidate, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Date of Birth</label>
                  <input
                    type="date"
                    value={newCandidate.dateOfBirth}
                    onChange={(e) => setNewCandidate({ ...newCandidate, dateOfBirth: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Living Location</label>
                  <input
                    type="text"
                    value={newCandidate.livingLocation}
                    onChange={(e) => setNewCandidate({ ...newCandidate, livingLocation: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Profession</label>
                  <input
                    type="text"
                    value={newCandidate.profession}
                    onChange={(e) => setNewCandidate({ ...newCandidate, profession: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Photo</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      {previewUrl ? (
                        <div className="relative h-32 w-32 mx-auto">
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            className="rounded-md object-cover"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl('');
                            }}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload a file</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={handleFileChange}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-900">Notes</label>
                  <textarea
                    value={newCandidate.notes}
                    onChange={(e) => setNewCandidate({ ...newCandidate, notes: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
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
                onClick={() => handleDeleteCandidate(candidateToDelete._id || '')}
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