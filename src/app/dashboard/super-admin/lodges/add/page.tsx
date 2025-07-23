'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BuildingLibraryIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Dynamically import the Map component to avoid SSR issues
const LodgeMap = dynamic(() => import('@/components/LodgeMap'), { ssr: false });

interface FormData {
  name: string;
  location: string;
  description: string;
  foundedYear: string;
  isActive: boolean;
  logoImage: File | null;
  backgroundImage: File | null;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export default function AddLodgePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>({
    lat: 33.8938, // Default to Beirut coordinates
    lng: 35.5018
  });
  
  useEffect(() => {
    // Get token from localStorage or sessionStorage
    const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    setToken(storedToken);
  }, []);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    description: '',
    foundedYear: '',
    isActive: true,
    logoImage: null,
    backgroundImage: null,
    coordinates: {
      lat: 33.8938,
      lng: 35.5018
    }
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checkbox.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'logo') {
        setFormData({ ...formData, logoImage: file });
        setLogoPreview(URL.createObjectURL(file));
      } else {
        setFormData({ ...formData, backgroundImage: file });
        setBackgroundPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setFormData({
      ...formData,
      coordinates: { lat, lng }
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Lodge name is required');
      }
      
      if (!formData.location.trim()) {
        throw new Error('Lodge location is required');
      }
      
      if (!token) {
        throw new Error('You are not authenticated. Please log in again.');
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('foundedYear', formData.foundedYear);
      formDataToSend.append('isActive', String(formData.isActive));
      formDataToSend.append('coordinates', JSON.stringify(formData.coordinates));
      
      if (formData.logoImage) {
        formDataToSend.append('logo', formData.logoImage);
      }
      
      if (formData.backgroundImage) {
        formDataToSend.append('background', formData.backgroundImage);
      }
      
      // Submit form data to API
      const response = await fetch('/api/lodges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create lodge');
      }
      
      // Show success message
      setSuccess('Lodge created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        location: '',
        description: '',
        foundedYear: '',
        isActive: true,
        logoImage: null,
        backgroundImage: null,
        coordinates: {
          lat: 33.8938,
          lng: 35.5018
        }
      });
      setLogoPreview(null);
      setBackgroundPreview(null);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/super-admin/lodges');
      }, 2000);
      
    } catch (err) {
      console.error('Error creating lodge:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Lodges
        </button>
        
        <h1 className="text-3xl font-semibold text-gray-900 mt-4">Add New Lodge</h1>
        <p className="mt-2 text-gray-600">Create a new lodge in the district.</p>
      </div>
      
      {/* Form */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Lodge Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  placeholder="Enter lodge description..."
                />
              </div>

              {/* Founded Year */}
              <div>
                <label htmlFor="foundedYear" className="block text-sm font-medium text-gray-700">
                  Founded Year
                </label>
                <input
                  type="number"
                  id="foundedYear"
                  name="foundedYear"
                  value={formData.foundedYear}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lodge Logo
                  </label>
                  <div className="mt-1 flex items-center">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                      {logoPreview ? (
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BuildingLibraryIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'logo')}
                      className="ml-4"
                      />
                  </div>
                </div>

                {/* Background Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Image
                  </label>
                  <div className="mt-1 flex items-center">
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                      {backgroundPreview ? (
                        <Image
                          src={backgroundPreview}
                          alt="Background preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BuildingLibraryIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'background')}
                      className="ml-4"
                      />
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lodge Location on Map
                </label>
                <div className="h-[400px] rounded-lg overflow-hidden border border-gray-300">
                  <LodgeMap
                    location={formData.location}
                    coordinates={selectedLocation}
                    onMapClick={handleMapClick}
                    isEditable={true}
                />
              </div>
                <p className="mt-2 text-sm text-gray-500">
                  Click on the map to set the lodge's location. Current coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </p>
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Lodge'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 