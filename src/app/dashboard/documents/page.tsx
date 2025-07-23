'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentTextIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Document {
  id: string;
  title: string;
  description: string;
  uploadedBy: string;
  uploadDate: string;
  fileSize: string;
  fileType: string;
  downloadUrl: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);

  useEffect(() => {
    // Check if user is authenticated using sessionStorage
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Fetch documents from API
    const fetchDocuments = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/documents', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        
        // Transform API data to match our interface
        const transformedDocuments: Document[] = (data.documents || []).map((doc: any) => ({
          id: doc._id || doc.id || Math.random().toString(36).substr(2, 9),
          title: doc.title,
          description: doc.description,
          uploadedBy: doc.uploadedByName || 'Unknown',
          uploadDate: doc.uploadDate,
          fileSize: doc.fileSize,
          fileType: doc.fileType.split('/').pop()?.toUpperCase() || 'Unknown',
          downloadUrl: doc.filePath
        }));

        setDocuments(transformedDocuments);
        setFilteredDocuments(transformedDocuments);
      } catch (error) {
        console.error('Error fetching documents:', error);
        // Fallback to empty array if API fails
        setDocuments([]);
        setFilteredDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [router]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(
        doc => 
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.fileType.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [searchQuery, documents]);

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Library</h1>
        <p className="text-gray-600">
          Access and download official documents shared by lodge administrators.
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search documents by title, description, or file type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Documents list */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search terms or check back later for new documents.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredDocuments.map((doc, index) => (
              <li key={doc.id || `doc-${index}`}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-purple-100 rounded-md p-2">
                        <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">{doc.title}</p>
                        <p className="text-sm text-gray-500">{doc.description}</p>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <a
                        href={doc.downloadUrl}
                        className="px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150 flex items-center"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {doc.fileType} · {doc.fileSize}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Uploaded by {doc.uploadedBy} on {formatDate(doc.uploadDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 