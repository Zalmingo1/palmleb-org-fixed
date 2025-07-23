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

export default function DistrictAddLodgePage() {
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
        router.push('/dashboard/district-admin/lodges');
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
          Back to District Lodges
        </button>
        
        <h1 className="text-3xl font-semibold text-gray-900 mt-4">Add New Lodge</h1>
        <p className="mt-2 text-gray-600">Create a new lodge in your district.</p>
      </div>

      {/* District Admin Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <BuildingLibraryIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>District Admin Access:</strong> You can create new lodges within your district. 
              The lodge will be automatically associated with your district.
            </p>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Lodge Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter lodge name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter lodge location"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="foundedYear" className="block text-sm font-medium text-gray-700 mb-2">
                    Founded Year
                  </label>
                  <input
                    type="text"
                    id="foundedYear"
                    name="foundedYear"
                    value={formData.foundedYear}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 2024"
                  />
                </div>
                
                <div>
                  <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                      Active Lodge
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter lodge description"
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="logoImage" className="block text-sm font-medium text-gray-700 mb-2">
                    Lodge Logo
                  </label>
                  <input
                    type="file"
                    id="logoImage"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'logo')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {logoPreview && (
                    <div className="mt-2">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        width={100}
                        height={100}
                        className="rounded-md"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label htmlFor="backgroundImage" className="block text-sm font-medium text-gray-700 mb-2">
                    Background Image
                  </label>
                  <input
                    type="file"
                    id="backgroundImage"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'background')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {backgroundPreview && (
                    <div className="mt-2">
                      <Image
                        src={backgroundPreview}
                        alt="Background preview"
                        width={200}
                        height={100}
                        className="rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Map */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location on Map</h3>
              <div className="border border-gray-300 rounded-md p-4">
                <LodgeMap
                  selectedLocation={selectedLocation}
                  onLocationSelect={handleMapClick}
                  height="400px"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Click on the map to set the lodge location. Current coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Lodge'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 