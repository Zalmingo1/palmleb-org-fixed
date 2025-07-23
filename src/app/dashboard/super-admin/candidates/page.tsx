'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface Candidate {
  _id?: string;
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

export default function SuperAdminCandidatesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState<Candidate>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    lodge: '',
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
    }
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  useEffect(() => {
    fetchCandidates();
    fetchLodges();
  }, []);

  const fetchCandidates = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
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
      console.log('Fetched candidates:', data);
      // Log each candidate's lodge field to debug
      data.forEach((candidate: any, index: number) => {
        console.log(`Candidate ${index + 1}:`, {
          name: `${candidate.firstName} ${candidate.lastName}`,
          lodge: candidate.lodge,
          lodgeId: candidate.lodgeId
        });
      });
      setCandidates(data);
      setFilteredCandidates(data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLodges = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch('/api/lodges', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch lodges');
      const data = await response.json();
      setLodges(data);
    } catch (error) {
      console.error('Error fetching lodges:', error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = candidates.filter(candidate => 
      candidate.firstName.toLowerCase().includes(query) ||
      candidate.lastName.toLowerCase().includes(query) ||
      (candidate.lodge && candidate.lodge.toLowerCase().includes(query)) ||
      candidate.status.toLowerCase().includes(query)
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
      let idPhotoUrl = '/default-avatar.png'; // Default image if no file is uploaded

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

      const candidateData = {
        ...newCandidate,
        idPhotoUrl,
      };

      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateData),
      });

      if (!response.ok) {
        throw new Error('Failed to add candidate');
      }

      // Refresh the list from the backend
      await fetchCandidates();
      setShowAddModal(false);
      setNewCandidate({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        lodge: '',
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
        }
      });
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error adding candidate:', error);
    }
  };

  const handleUpdateTiming = async (candidateId: string, timing: { startDate: string; endDate: string }) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`/api/candidates/${candidateId}/timing`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timing)
      });

      if (!response.ok) throw new Error('Failed to update timing');
      fetchCandidates();
    } catch (error) {
      console.error('Error updating timing:', error);
    }
  };

  const handleEditCandidate = async (candidate: Candidate) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      console.log('Updating candidate:', candidate);
      console.log('Candidate ID:', candidate._id);

      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidate),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error('Failed to update candidate');
      }

      const updatedCandidate = await response.json();
      console.log('Updated candidate:', updatedCandidate);
      
      // Refresh the candidates list to get the latest data
      await fetchCandidates();
      setShowEditModal(false);
      setEditingCandidate(null);
    } catch (error) {
      console.error('Error updating candidate:', error);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete candidate');
      // Refresh the list from the backend
      await fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidate:', error);
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
          Add, edit, and manage candidates for membership. Set their timing and monitor their status.
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
                        <p>Lodge: {candidate.lodge || 'Not specified'}</p>
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
                <div className="mt-4">
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">Notes:</p>
                    <p className="mt-1">{candidate.notes}</p>
                  </div>
                  <div className="mt-2 text-sm text-gray-900">
                    <p>Submitted by {candidate.submittedBy} on {new Date(candidate.submissionDate).toLocaleDateString()}</p>
                  </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-900">Parent Lodge</label>
                <select
                  value={newCandidate.lodge}
                  onChange={(e) => setNewCandidate({ ...newCandidate, lodge: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  required
                >
                  <option value="">Select a lodge</option>
                  {lodges.map((lodge) => (
                    <option key={lodge._id} value={lodge.name}>
                      {lodge.name}
                    </option>
                  ))}
                </select>
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
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
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
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCandidate}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Edit Modal */}
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={editingCandidate.lastName}
                    onChange={(e) => setEditingCandidate({...editingCandidate, lastName: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    value={editingCandidate.dateOfBirth}
                    onChange={(e) => setEditingCandidate({...editingCandidate, dateOfBirth: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Parent Lodge</label>
                  <select
                    value={editingCandidate.lodge}
                    onChange={(e) => setEditingCandidate({...editingCandidate, lodge: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select a lodge</option>
                    {lodges.map((lodge) => (
                      <option key={lodge._id} value={lodge.name}>
                        {lodge.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Living Location</label>
                  <input
                    type="text"
                    value={editingCandidate.livingLocation}
                    onChange={(e) => setEditingCandidate({...editingCandidate, livingLocation: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profession</label>
                  <input
                    type="text"
                    value={editingCandidate.profession}
                    onChange={(e) => setEditingCandidate({...editingCandidate, profession: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={editingCandidate.notes}
                    onChange={(e) => setEditingCandidate({...editingCandidate, notes: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
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

      {/* Add Delete Confirmation Modal */}
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
                onClick={() => handleDeleteCandidate(candidateToDelete._id!)}
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