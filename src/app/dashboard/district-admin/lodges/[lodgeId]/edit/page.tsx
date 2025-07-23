'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import LodgeMap from '@/components/LodgeMap';
import { use } from 'react';

interface Lodge {
  _id: string;
  name: string;
  location: string;
  foundedYear: string;
  description: string;
  isActive: boolean;
  logoImage?: string;
  backgroundImage?: string;
}

interface FormData {
  name: string;
  number: string;
  location: string;
  foundedYear: number;
  description: string;
  logo: File | null;
  backgroundImage: File | null;
  coordinates: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export default function DistrictEditLodgePage({ params }: { params: Promise<{ lodgeId: string }> }) {
  const router = useRouter();
  const { lodgeId } = use(params);
  
  if (!lodgeId) {
    router.push('/dashboard/district-admin/lodges');
    return null;
  }
  
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number>(16 / 9);
  
  const [lodge, setLodge] = useState<Lodge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined);
  const [backgroundPreview, setBackgroundPreview] = useState<string | undefined>(undefined);
  const [showCrop, setShowCrop] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    number: '',
    location: '',
    foundedYear: new Date().getFullYear(),
    description: '',
    logo: null,
    backgroundImage: null,
    coordinates: {
      lat: 33.8938,
      lng: 35.5018
    },
    isActive: true
  });
  
  useEffect(() => {
    // Fetch lodge data
    const fetchLodge = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get token from localStorage or sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/lodges/${lodgeId}`, { headers });
        
        if (!response.ok) {
          throw new Error('Failed to fetch lodge data');
        }
        
        const data = await response.json();
        console.log('Fetched lodge data:', data);
        setLodge(data);
        
        // Set form data with explicit boolean value for isActive
        setFormData({
          name: data.name || '',
          number: data.number || '',
          location: data.location || '',
          foundedYear: data.foundedYear ? parseInt(data.foundedYear) : new Date().getFullYear(),
          description: data.description || '',
          logo: null,
          backgroundImage: null,
          coordinates: {
            lat: data.coordinates?.lat || 33.8938,
            lng: data.coordinates?.lng || 35.5018
          },
          isActive: data.isActive === undefined ? true : Boolean(data.isActive)  // Ensure boolean value
        });

        // Set image previews if they exist
        if (data.logoImage) {
          // Handle both URL and base64 images
          const logoPath = data.logoImage.startsWith('data:') 
            ? data.logoImage 
            : data.logoImage.startsWith('http') 
              ? data.logoImage 
              : `${window.location.origin}${data.logoImage.startsWith('/') ? '' : '/'}${data.logoImage}`;
          console.log('Setting logo preview:', logoPath);
          setLogoPreview(logoPath);
        }
        if (data.backgroundImage) {
          // Handle both URL and base64 images
          const backgroundPath = data.backgroundImage.startsWith('data:') 
            ? data.backgroundImage 
            : data.backgroundImage.startsWith('http') 
              ? data.backgroundImage 
              : `${window.location.origin}${data.backgroundImage.startsWith('/') ? '' : '/'}${data.backgroundImage}`;
          console.log('Setting background preview:', backgroundPath);
          setBackgroundPreview(backgroundPath);
        }
      } catch (err) {
        console.error('Error fetching lodge:', err);
        setError('Failed to load lodge. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLodge();
  }, [lodgeId]);
  
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
        setFormData({ ...formData, logo: file });
        setLogoPreview(URL.createObjectURL(file));
      } else {
        console.log('Handling background image change:', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        });
        setFormData({ ...formData, backgroundImage: file });
        const imageUrl = URL.createObjectURL(file);
        setBackgroundPreview(imageUrl);
        setShowCrop(true);
      }
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  };

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop);
  };

  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
        setFormData({ ...formData, backgroundImage: file });
        setBackgroundPreview(URL.createObjectURL(blob));
        setShowCrop(false);
      }
    }, 'image/jpeg');
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    setBackgroundPreview(undefined);
    setFormData({ ...formData, backgroundImage: null });
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
      
      // Get token from localStorage or sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('You are not authenticated. Please log in again.');
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('foundedYear', formData.foundedYear.toString());
      formDataToSend.append('isActive', String(formData.isActive));
      formDataToSend.append('coordinates.lat', formData.coordinates.lat.toString());
      formDataToSend.append('coordinates.lng', formData.coordinates.lng.toString());
      
      if (formData.logo) {
        formDataToSend.append('logoImage', formData.logo);
      }
      
      if (formData.backgroundImage) {
        formDataToSend.append('backgroundImage', formData.backgroundImage);
      }
      
      // Submit form data to API
      console.log('Submitting lodge update:', {
        lodgeId,
        formData: Object.fromEntries(formDataToSend.entries()),
        hasToken: !!token
      });
      
      const response = await fetch(`/api/lodges/${lodgeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = 'Failed to update lodge';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // Show success message
      setSuccess('Lodge updated successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/district-admin/lodges');
      }, 2000);
      
    } catch (err) {
      console.error('Error updating lodge:', err);
      
      let errorMessage = 'An unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !lodge) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

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
        
        <h1 className="text-3xl font-semibold text-gray-900 mt-4">Edit Lodge</h1>
        <p className="mt-2 text-gray-600">Update lodge information in your district.</p>
      </div>

      {/* District Admin Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <BuildingLibraryIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>District Admin Access:</strong> You can edit lodges within your district. 
              Changes will be applied immediately.
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Enter lodge location"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="foundedYear" className="block text-sm font-medium text-gray-700 mb-2">
                    Founded Year
                  </label>
                  <input
                    type="number"
                    id="foundedYear"
                    name="foundedYear"
                    value={formData.foundedYear}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
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
                  location={formData.location}
                  coordinates={formData.coordinates}
                  onMapClick={(lat: number, lng: number) => {
                    setFormData({
                      ...formData,
                      coordinates: { lat, lng }
                    });
                  }}
                  isEditable={true}
                />
                <p className="mt-2 text-sm text-gray-600">
                  Click on the map to set the lodge location. Current coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Crop Modal */}
            {showCrop && backgroundPreview && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Crop Background Image</h3>
                  <div className="mb-4">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={handleCropComplete}
                      aspect={aspect}
                    >
                      <img
                        ref={imgRef}
                        alt="Crop me"
                        src={backgroundPreview}
                        onLoad={onImageLoad}
                        className="max-w-full"
                      />
                    </ReactCrop>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={handleCropCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCropConfirm}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Confirm Crop
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                {isSubmitting ? 'Updating...' : 'Update Lodge'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 