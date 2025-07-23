'use client';

import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PhotoIcon, FilmIcon, XMarkIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

// Define file size limits similar to Facebook
const FILE_SIZE_LIMITS = {
  IMAGE: 4 * 1024 * 1024, // 4MB
  VIDEO: 4 * 1024 * 1024 * 1024, // 4GB
  ALBUM_TOTAL: 30 * 1024 * 1024, // 30MB total for album
};

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];

type MediaFile = {
  file: File;
  preview: string;
  type: 'image' | 'video';
};

function CreatePostWidgetComponent() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get token from sessionStorage only on client side
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('token');
      setToken(storedToken);
    }
  }, []);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    if (typeof window !== 'undefined') {
      alert(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (!token) {
        handleError('You are not authenticated. Please log in again.');
        return;
      }

      // Create FormData for the post
      const formData = new FormData();
      formData.append('content', content);

      // Add files to FormData
      mediaFiles.forEach((media, index) => {
        formData.append(`files`, media.file);
      });

      // Send the post to the API
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        handleError('Failed to parse server response');
        return;
      }

      if (!response.ok) {
        handleError(responseData?.message || 'Failed to create post');
        return;
      }

      // Reset form
      setContent('');
      setMediaFiles([]);

      // Show success message and update posts
      if (typeof window !== 'undefined') {
        alert('Post created successfully!');
        window.dispatchEvent(new Event('posts-updated'));
      }
    } catch (error) {
      console.error('Error creating post:', error);
      handleError(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateFile = (file: File, isAlbum: boolean = false): boolean => {
    // Check file type
    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      if (file.size > FILE_SIZE_LIMITS.IMAGE) {
        setError(`Image too large. Maximum size is ${FILE_SIZE_LIMITS.IMAGE / (1024 * 1024)}MB.`);
        return false;
      }
    } else if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
      if (file.size > FILE_SIZE_LIMITS.VIDEO) {
        setError(`Video too large. Maximum size is ${FILE_SIZE_LIMITS.VIDEO / (1024 * 1024 * 1024)}GB.`);
        return false;
      }
    } else {
      setError('Unsupported file type.');
      return false;
    }

    // For albums, check total size
    if (isAlbum) {
      const currentTotalSize = mediaFiles.reduce((total, media) => total + media.file.size, 0);
      if (currentTotalSize + file.size > FILE_SIZE_LIMITS.ALBUM_TOTAL) {
        setError(`Album too large. Maximum total size is ${FILE_SIZE_LIMITS.ALBUM_TOTAL / (1024 * 1024)}MB.`);
        return false;
      }
    }

    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'album') => {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      // For single file uploads (image or video)
      if (fileType === 'image' || fileType === 'video') {
        const file = files[0];
        if (!validateFile(file)) return;

        // Create a preview URL
        const preview = URL.createObjectURL(file);
        setMediaFiles(prev => [...prev, { file, preview, type: fileType }]);
      } 
      // For album uploads
      else if (fileType === 'album') {
        const newFiles = Array.from(files);
        for (const file of newFiles) {
          if (!validateFile(file, true)) return;
        }

        // Create preview URLs for all files
        const newMediaFiles = newFiles.map(file => ({
          file,
          preview: URL.createObjectURL(file),
          type: 'image' as const
        }));

        setMediaFiles(prev => [...prev, ...newMediaFiles]);
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      setError('Failed to process files');
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const triggerImageUpload = () => imageInputRef.current?.click();
  const triggerVideoUpload = () => videoInputRef.current?.click();
  const triggerAlbumUpload = () => albumInputRef.current?.click();

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Create Post</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
          rows={3}
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
        ></textarea>

        {/* Media Preview */}
        {mediaFiles.length > 0 && (
          <div className="mt-3 border border-gray-200 rounded-lg p-3">
            <div className="flex flex-wrap gap-2">
              {mediaFiles.map((media, index) => (
                <div key={index} className="relative">
                  {media.type === 'image' ? (
                    <img 
                      src={media.preview} 
                      alt="Preview" 
                      className="h-24 w-24 object-cover rounded-md"
                    />
                  ) : (
                    <video 
                      src={media.preview} 
                      className="h-24 w-24 object-cover rounded-md" 
                      controls
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-white"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-2 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Media Upload Options and Post Button */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={triggerImageUpload}
              disabled={isSubmitting}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PhotoIcon className="h-5 w-5 mr-1 text-green-500" />
              Photo
            </button>
            <button
              type="button"
              onClick={triggerAlbumUpload}
              disabled={isSubmitting}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PhotoIcon className="h-5 w-5 mr-1 text-blue-500" />
              Album
            </button>
            <button
              type="button"
              onClick={triggerVideoUpload}
              disabled={isSubmitting}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FilmIcon className="h-5 w-5 mr-1 text-red-500" />
              Video
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Posting...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                Post
              </>
            )}
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={imageInputRef}
          onChange={(e) => handleFileChange(e, 'image')}
          accept={SUPPORTED_IMAGE_TYPES.join(',')}
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={(e) => handleFileChange(e, 'video')}
          accept={SUPPORTED_VIDEO_TYPES.join(',')}
          className="hidden"
        />
        <input
          type="file"
          ref={albumInputRef}
          onChange={(e) => handleFileChange(e, 'album')}
          accept={SUPPORTED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
        />
      </form>
    </div>
  );
}

// Export the component with dynamic import and ssr disabled
export default dynamic(() => Promise.resolve(CreatePostWidgetComponent), {
  ssr: false
}); 