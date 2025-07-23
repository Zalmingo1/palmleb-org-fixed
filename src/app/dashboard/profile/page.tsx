'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, updateUserProfile } from '@/lib/auth/client';
import Image from 'next/image';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  primaryLodge?: {
    _id: string;
    name: string;
  };
  primaryLodgePosition?: string;
  lodgeMemberships?: Array<{
    lodge: {
      _id: string;
      name: string;
    };
    position: string;
  }>;
  profileImage?: string;
  occupation?: string;
  interests?: string[];
  bio?: string;
  memberSince?: string;
  status: 'active' | 'inactive';
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  primaryLodge: string;
  primaryLodgePosition: string;
  lodgeMemberships: Array<{ lodge: string; position: string }>;
  profileImage: string;
  occupation: string;
  interests: string[];
  bio: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [lodges, setLodges] = useState<{ [key: string]: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    primaryLodge: '',
    primaryLodgePosition: '',
    lodgeMemberships: [],
    profileImage: '',
    occupation: '',
    interests: [],
    bio: ''
  });
  const [lodgeName, setLodgeName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const imageRef = useRef<HTMLImageElement>(null);

  const fetchLodges = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/lodges/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const lodgesMap: { [key: string]: string } = {};
        (data.lodges || data).forEach((lodge: any) => {
          lodgesMap[lodge._id] = lodge.name;
        });
        setLodges(lodgesMap);
      }
    } catch (error) {
      console.error('Error fetching lodges:', error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = sessionStorage.getItem('user');
        console.log('Raw user data from session:', userData);
        
        if (!userData) {
          router.push('/');
          return;
        }

        const currentUser = JSON.parse(userData);
        console.log('Parsed user data:', currentUser);
        
        // Fetch complete profile data
        try {
          const token = sessionStorage.getItem('token');
          const profileResponse = await fetch('/api/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('Complete profile data:', profileData);
            
            // Update currentUser with complete profile data
            Object.assign(currentUser, profileData);
            
            // If primaryLodge is populated, set the lodge name
            if (profileData.primaryLodge && typeof profileData.primaryLodge === 'object') {
              setLodgeName(profileData.primaryLodge.name);
            }
            
            // Update session storage with complete data
            sessionStorage.setItem('user', JSON.stringify(currentUser));
          } else {
            console.error('Failed to fetch complete profile data:', profileResponse.status);
          }
        } catch (error) {
          console.error('Error fetching complete profile data:', error);
        }
        
        setUser(currentUser);

        // Transform the data to match the form structure
        const transformedData = {
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          address: currentUser.address || '',
          city: currentUser.city || '',
          state: currentUser.state || '',
          zipCode: currentUser.zipCode || '',
          country: currentUser.country || '',
          primaryLodge: currentUser.primaryLodge && typeof currentUser.primaryLodge === 'object' 
            ? currentUser.primaryLodge._id 
            : (currentUser.primaryLodge || ''),
          primaryLodgePosition: currentUser.primaryLodgePosition || '',
          lodgeMemberships: (currentUser.lodgeMemberships || []).map((m: any) => ({
            lodge: m.lodge?._id || m.lodge || '',
            position: m.position || ''
          })),
          profileImage: currentUser.profileImage || '',
          occupation: currentUser.occupation || '',
          interests: Array.isArray(currentUser.interests) ? currentUser.interests : [],
          bio: currentUser.bio || ''
        };

        console.log('Transformed form data:', transformedData);
        setFormData(transformedData);
        setImageError(false); // Reset image error state when user data is loaded
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/');
      }
    };

    fetchUserData();
    fetchLodges();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'interests') {
      // Split by comma and trim each interest
      const interestsArray = value.split(',').map(interest => interest.trim()).filter(interest => interest !== '');
      setFormData(prev => ({
        ...prev,
        interests: interestsArray
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value || ''
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (crop: Crop) => {
    setCrop(crop);
  };

  const handleCropSave = async () => {
    if (!imageRef.current || !crop || !crop.width || !crop.height) {
      setShowCropModal(false);
      setSelectedImage(null);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
      const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.beginPath();
        ctx.arc(crop.width / 2, crop.height / 2, crop.width / 2, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.drawImage(
          imageRef.current,
          crop.x * scaleX,
          crop.y * scaleY,
          crop.width * scaleX,
          crop.height * scaleY,
          0,
          0,
          crop.width,
          crop.height
        );

        const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Convert data URL to blob and upload
        const response = await fetch(croppedImageUrl);
        const blob = await response.blob();
        
        const token = sessionStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'profile-image.jpg');

        const uploadResponse = await fetch('/api/profile/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(data.error || 'Failed to upload image');
        }

        // Update form data with new image URL
        setFormData(prev => ({ ...prev, profileImage: data.imageUrl }));
        
        // Update user data in session storage
        const currentUserData = JSON.parse(sessionStorage.getItem('user') || '{}');
        const updatedUserData = { ...currentUserData, profileImage: data.imageUrl };
        sessionStorage.setItem('user', JSON.stringify(updatedUserData));
        
        // Update user state
        setUser(prev => prev ? { ...prev, profileImage: data.imageUrl } : null);
        
        // Reset image error state for new image
        setImageError(false);
        
        setSuccess('Profile image updated successfully');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
    }

    setShowCropModal(false);
    setSelectedImage(null);
    setCrop(undefined);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedImage(null);
    setCrop(undefined);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Transform the data to match the API's expected format
      const apiData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        occupation: formData.occupation,
        bio: formData.bio,
        profileImage: formData.profileImage,
        interests: formData.interests
      };

      console.log('Submitting form data:', apiData);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update session storage with new user data
      const currentUserData = JSON.parse(sessionStorage.getItem('user') || '{}');
      const updatedUserData = {
        ...currentUserData,
        ...data,
        role: data.role || currentUserData.role // Ensure role is preserved
      };
      sessionStorage.setItem('user', JSON.stringify(updatedUserData));
      sessionStorage.setItem('userRole', data.role || currentUserData.role); // Update userRole as well

      setSuccess('Profile updated successfully');
      setIsEditing(false); // Close edit mode after successful save
      setFormData(data);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-600 mt-1">Manage your personal information and lodge memberships</p>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isEditing 
                    ? 'bg-gray-500 text-white hover:bg-gray-600' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isEditing ? 'Cancel Editing' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Image and Basic Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {/* Profile Image */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-32 h-32 mb-4">
                    {(formData.profileImage || user?.profileImage) && !imageError ? (
                      <Image
                        src={formData.profileImage || user?.profileImage || ''}
                        alt="Profile"
                        width={128}
                        height={128}
                        className="rounded-full object-cover border-4 border-white shadow-lg"
                        priority
                        onError={() => {
                          setImageError(true);
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                        <span className="text-4xl text-white font-semibold">
                          {(formData.firstName || user?.firstName || '')[0]}{(formData.lastName || user?.lastName || '')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex flex-col items-center space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="text-xs text-gray-500 text-center">Select an image to crop and upload as your profile picture</p>
                    </div>
                  )}
                </div>

                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Basic Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{user?.firstName || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{user?.lastName || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900 font-medium">{user?.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{user?.occupation || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column - Contact Information */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{user?.phone || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{user?.address || 'Not provided'}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{user?.city || 'Not provided'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{user?.state || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{user?.zipCode || 'Not provided'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{user?.country || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Lodge Information and Additional Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Lodge Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Lodge Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Lodge</label>
                    <p className="text-gray-900 font-medium">
                      {user?.primaryLodge?.name || lodgeName || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    {isEditing && (user?.role === 'SUPER_ADMIN' || user?.role === 'DISTRICT_ADMIN' || user?.role === 'LODGE_ADMIN') ? (
                      <select
                        name="primaryLodgePosition"
                        value={formData.primaryLodgePosition}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="">Select Position</option>
                        <option value="WORSHIPFUL_MASTER">Worshipful Master</option>
                        <option value="SENIOR_WARDEN">Senior Warden</option>
                        <option value="JUNIOR_WARDEN">Junior Warden</option>
                        <option value="TREASURER">Treasurer</option>
                        <option value="SECRETARY">Secretary</option>
                        <option value="SENIOR_DEACON">Senior Deacon</option>
                        <option value="JUNIOR_DEACON">Junior Deacon</option>
                        <option value="SENIOR_STEWARD">Senior Steward</option>
                        <option value="JUNIOR_STEWARD">Junior Steward</option>
                        <option value="CHAPLAIN">Chaplain</option>
                        <option value="MARSHAL">Marshal</option>
                        <option value="TYLER">Tyler</option>
                        <option value="MUSICIAN">Musician</option>
                        <option value="MASTER_OF_CEREMONIES">Master of Ceremonies</option>
                        <option value="HISTORIAN">Historian</option>
                        <option value="LODGE_EDUCATION_OFFICER">Lodge Education Officer</option>
                        <option value="ALMONER">Almoner</option>
                        <option value="MEMBER">Member</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {user?.primaryLodgePosition?.replace(/_/g, ' ') || 'Not provided'}
                      </p>
                    )}
                    {isEditing && !(user?.role === 'SUPER_ADMIN' || user?.role === 'DISTRICT_ADMIN' || user?.role === 'LODGE_ADMIN') && (
                      <p className="text-xs text-gray-500 mt-1">
                        Lodge positions can only be changed by administrators
                      </p>
                    )}
                  </div>
                  
                  {/* Additional Lodge Memberships */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Lodge Memberships</label>
                    {(() => {
                      // Filter out the primary lodge from additional memberships
                      const primaryLodgeId = user?.primaryLodge?._id || user?.primaryLodge;
                      const additionalMemberships = user?.lodgeMemberships?.filter(membership => {
                        const membershipLodgeId = typeof membership.lodge === 'string' ? membership.lodge : membership.lodge?._id;
                        return membershipLodgeId !== primaryLodgeId;
                      }) || [];
                      
                      if (additionalMemberships.length > 0) {
                        return (
                          <div className="space-y-2">
                            {additionalMemberships.map((membership, index) => {
                              // Get lodge name from lodges mapping or from membership data
                              const lodgeId = typeof membership.lodge === 'string' ? membership.lodge : membership.lodge?._id;
                              const lodgeName = membership.lodge?.name || 
                                              lodges[lodgeId || ''] || 
                                              'Unknown Lodge';
                              return (
                                <div key={index} className="text-sm text-gray-900 bg-gray-50 rounded-lg p-2">
                                  <span className="font-medium">{lodgeName}</span>
                                  {membership.position && (
                                    <span className="text-gray-500 ml-2">({membership.position.replace(/_/g, ' ')})</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        return <p className="text-gray-500 text-sm">No additional lodge memberships</p>;
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Additional Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="interests"
                        value={formData.interests?.join(', ') || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter interests separated by commas"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {((user?.interests?.length ?? 0) > 0 || (formData.interests?.length ?? 0) > 0) ? (
                          ((user?.interests?.length ?? 0) > 0 ? user?.interests ?? [] : formData.interests ?? []).map((interest, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {interest}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">Not provided</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap text-sm">
                        {user?.bio || 'Not provided'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isSubmitting 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Crop Modal */}
      {showCropModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Crop Profile Image</h2>
            <p className="text-sm text-gray-600 mb-4">Drag to select the area you want to crop. The image will be cropped to a circle.</p>
            
            <div className="flex justify-center mb-4">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={handleCropComplete}
                aspect={1}
                circularCrop
                className="max-w-full"
              >
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Crop preview"
                  className="max-w-full max-h-96 object-contain"
                />
              </ReactCrop>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCropCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Cropped Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 