'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentTextIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';

export default function DocumentUploadPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      // ignore
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid file type (PDF, DOC, DOCX, TXT, JPG, PNG)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !selectedFile) {
      setError('Please fill in all fields and select a file');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', selectedFile);

      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setSuccess('Document uploaded successfully!');
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Redirect to documents page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/documents');
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`/api/documents/upload?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete document');
      setSuccess('Document deleted successfully!');
      setDocuments((docs) => docs.filter((doc) => doc._id !== id && doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Upload Document</h1>
        <p className="text-gray-600">
          Share a new document with lodge members. Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG (max 10MB).
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              placeholder="Enter document title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              placeholder="Enter document description"
              required
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document File *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {selectedFile ? (
                  <div className="flex items-center justify-center">
                    <DocumentTextIcon className="h-8 w-8 text-blue-500 mr-2" />
                    <span className="text-sm text-gray-600">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
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
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT, JPG, PNG up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard/documents')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>

      {/* List of uploaded documents */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Uploaded Documents</h2>
        {isLoadingDocs ? (
          <div>Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-gray-500">No documents uploaded yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc._id || doc.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{doc.title}</div>
                  <div className="text-sm text-gray-600">{doc.description}</div>
                  <a href={doc.filePath} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">View</a>
                </div>
                <button
                  onClick={() => handleDelete(doc._id || doc.id)}
                  className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  disabled={isLoading}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 