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

export default function EditLodgePage({ params }: { params: Promise<{ lodgeId: string }> }) {
  const router = useRouter();
  const { lodgeId } = use(params);
  
  if (!lodgeId) {
    router.push('/dashboard/super-admin/lodges');
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
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop);
  };

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );

    // Convert the canvas to a blob with high quality
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('Cropped background image:', {
          width: canvas.width,
          height: canvas.height,
          blobSize: blob.size,
          blobType: blob.type
        });
        const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
        setFormData({ ...formData, backgroundImage: file });
        // Create a new URL for the cropped image preview
        const croppedImageUrl = URL.createObjectURL(blob);
        setBackgroundPreview(croppedImageUrl);
        setShowCrop(false);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    // If there was a previous background image, restore it
    if (lodge?.backgroundImage) {
      console.log('Restoring previous background image:', lodge.backgroundImage);
      setBackgroundPreview(lodge.backgroundImage);
    } else {
      setBackgroundPreview(undefined);
    }
    setFormData({ ...formData, backgroundImage: null });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      setError('Lodge name is required');
      return;
    }
    
    if (!formData.location.trim()) {
      setError('Location is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
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
      formDataToSend.append('foundedYear', String(formData.foundedYear));
      formDataToSend.append('isActive', String(formData.isActive));
      
      // Add coordinates to form data
      formDataToSend.append('coordinates.lat', String(formData.coordinates.lat));
      formDataToSend.append('coordinates.lng', String(formData.coordinates.lng));
      
      if (formData.logo) {
        formDataToSend.append('logoImage', formData.logo);
      }
      
      if (formData.backgroundImage) {
        console.log('Appending background image to form data:', {
          name: formData.backgroundImage.name,
          type: formData.backgroundImage.type,
          size: formData.backgroundImage.size
        });
        formDataToSend.append('backgroundImage', formData.backgroundImage);
      }
      
      // Submit form data to API
      const response = await fetch(`/api/lodges/${lodgeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lodge');
      }
      
      // Show success message
      setSuccess('Lodge updated successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/super-admin/lodges');
      }, 2000);
    } catch (err) {
      console.error('Error updating lodge:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/super-admin/lodges')}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Lodges
        </button>
        
        <h1 className="text-3xl font-semibold text-gray-900 mt-4">Edit Lodge</h1>
        <p className="mt-2 text-gray-600">Update the details for {lodge?.name}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Uploads */}
              <div className="md:col-span-2">
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
                      <div className="ml-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, 'logo')}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Recommended: Square image, at least 256x256 pixels
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Background Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Image
                    </label>
                    <div className="mt-1">
                      {showCrop ? (
                        <div className="space-y-4">
                          <div className="relative w-full h-96">
                            <ReactCrop
                              crop={crop}
                              onChange={(c) => setCrop(c)}
                              onComplete={handleCropComplete}
                              aspect={aspect}
                            >
                              <img
                                ref={imgRef}
                                src={backgroundPreview}
                                alt="Background preview"
                                onLoad={onImageLoad}
                                className="max-w-full max-h-full"
                              />
                            </ReactCrop>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={handleCropCancel}
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleCropConfirm}
                              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                              Confirm Crop
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                          {backgroundPreview ? (
                            <Image
                              src={backgroundPreview || ''}
                              alt="Background preview"
                              fill
                              className="object-cover"
                              style={{ objectPosition: 'center' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BuildingLibraryIcon className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, 'background')}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Recommended: Landscape image, at least 1920x1080 pixels
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lodge Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Lodge Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  placeholder="Enter lodge name"
                  required
                />
              </div>
              
              {/* Location and Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Coordinates
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        step="any"
                        name="coordinates.lat"
                        value={formData.coordinates.lat}
                        onChange={(e) => setFormData({
                          ...formData,
                          coordinates: {
                            ...formData.coordinates,
                            lat: parseFloat(e.target.value)
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Latitude"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="any"
                        name="coordinates.lng"
                        value={formData.coordinates.lng}
                        onChange={(e) => setFormData({
                          ...formData,
                          coordinates: {
                            ...formData.coordinates,
                            lng: parseFloat(e.target.value)
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Longitude"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Founded Year */}
              <div>
                <label htmlFor="foundedYear" className="block text-sm font-medium text-gray-700">
                  Founded Year
                </label>
                <input
                  type="text"
                  id="foundedYear"
                  name="foundedYear"
                  value={formData.foundedYear}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  placeholder="e.g., 1950"
                />
              </div>
              
              {/* Status */}
              <div>
                <label htmlFor="isActive" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="mt-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                      Active
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Inactive lodges won't appear in some lists and reports</p>
                </div>
              </div>
              
              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  placeholder="Brief description of the lodge..."
                />
              </div>
              
              {/* Map Preview */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Map Preview
                </label>
                <div className="mt-4 h-[300px] w-full rounded-lg overflow-hidden">
                  <LodgeMap
                    location={formData.location}
                    coordinates={formData.coordinates}
                    isEditable={true}
                    onMapClick={(lat, lng) => {
                      setFormData({
                        ...formData,
                        coordinates: {
                          lat,
                          lng
                        }
                      });
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Click on the map to set the lodge location. The marker will be placed at the clicked position.
                </p>
              </div>
              
              {/* Form Actions */}
              <div className="md:col-span-2 flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/super-admin/lodges')}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update Lodge'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 