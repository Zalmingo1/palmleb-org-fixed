'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

export default function LodgeEditPage({ params }: { params: Promise<{ lodgeId: string }> }) {
  const router = useRouter();
  const { lodgeId } = use(params);
  
  if (!lodgeId) {
    router.push('/dashboard/lodge-admin');
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
  const [user, setUser] = useState<any>(null);
  
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
    // Check user permissions first
    const checkPermissions = async () => {
      try {
        const userData = sessionStorage.getItem('user');
        if (!userData) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userData);
        setUser(user);

        // Check if user is a lodge admin
        if (user.role !== 'LODGE_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'DISTRICT_ADMIN') {
          setError('You do not have permission to edit lodges.');
          setIsLoading(false);
          return;
        }

        // Check if user has access to this specific lodge
        const administeredLodges = Array.isArray(user.administeredLodges) ? user.administeredLodges : [];
        const primaryLodge = user.primaryLodge?._id || user.primaryLodge;
        
        const hasLodgeAccess = user.role === 'SUPER_ADMIN' || 
                             user.role === 'DISTRICT_ADMIN' || 
                             administeredLodges.includes(lodgeId) || 
                             primaryLodge === lodgeId;
        
        if (!hasLodgeAccess) {
          setError('You do not have access to edit this lodge.');
          setIsLoading(false);
          return;
        }

        // If permissions are good, fetch lodge data
        await fetchLodge();
      } catch (err) {
        console.error('Error checking permissions:', err);
        setError('Error checking permissions. Please try logging in again.');
        setIsLoading(false);
      }
    };
    
    checkPermissions();
  }, [lodgeId, router]);

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
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop);
  };

  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current) {
      setShowCrop(false);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

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
        completedCrop.height,
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          setFormData({ ...formData, backgroundImage: file });
          setBackgroundPreview(canvas.toDataURL());
        }
      }, 'image/jpeg');

      setShowCrop(false);
    } catch (e) {
      console.error('Error cropping image:', e);
      setShowCrop(false);
    }
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    setBackgroundPreview(undefined);
    setFormData({ ...formData, backgroundImage: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('User session not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('number', formData.number);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('foundedYear', formData.foundedYear.toString());
      formDataToSend.append('description', formData.description);
      formDataToSend.append('isActive', formData.isActive.toString());
      formDataToSend.append('coordinates[lat]', formData.coordinates.lat.toString());
      formDataToSend.append('coordinates[lng]', formData.coordinates.lng.toString());

      if (formData.logo) {
        formDataToSend.append('logo', formData.logo);
      }
      if (formData.backgroundImage) {
        formDataToSend.append('backgroundImage', formData.backgroundImage);
      }

      const response = await fetch(`/api/lodges/${lodgeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lodge');
      }

      setSuccess('Lodge updated successfully!');
      
      // Refresh lodge data
      await fetchLodge();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating lodge:', err);
      setError(err instanceof Error ? err.message : 'Failed to update lodge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setFormData({
      ...formData,
      coordinates: { lat, lng }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            onClick={() => router.back()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 text-black">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        
        <div className="flex items-center space-x-3">
          <BuildingLibraryIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-black">Edit Lodge</h1>
            <p className="text-gray-600">Update lodge information and settings</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-black mb-6">Basic Information</h2>
          
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-2">
                Lodge Number
              </label>
              <input
                type="text"
                id="number"
                name="number"
                value={formData.number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                min="1800"
                max={new Date().getFullYear()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Active Lodge</span>
            </label>
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-black mb-6">Images</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                Lodge Logo
              </label>
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={(e) => handleImageChange(e, 'logo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {logoPreview && (
                <div className="mt-2">
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    width={100}
                    height={100}
                    className="rounded border"
                  />
                </div>
              )}
            </div>

            {/* Background Image Upload */}
            <div>
              <label htmlFor="backgroundImage" className="block text-sm font-medium text-gray-700 mb-2">
                Background Image
              </label>
              <input
                type="file"
                id="backgroundImage"
                accept="image/*"
                onChange={(e) => handleImageChange(e, 'background')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {backgroundPreview && (
                <div className="mt-2">
                  <Image
                    src={backgroundPreview}
                    alt="Background preview"
                    width={200}
                    height={100}
                    className="rounded border"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Location</h2>
          <p className="text-sm text-gray-600 mb-4">
            Click on the map to set the lodge location coordinates.
          </p>
          <div className="h-96 rounded-lg overflow-hidden">
            <LodgeMap
              coordinates={formData.coordinates}
              onMapClick={handleMapClick}
              location={formData.location}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Image Crop Modal */}
      {showCrop && backgroundPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
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
                  alt="Crop preview"
                  src={backgroundPreview}
                  onLoad={onImageLoad}
                  className="max-w-full"
                />
              </ReactCrop>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCropCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Confirm Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 