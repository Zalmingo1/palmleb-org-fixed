'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  UserCircleIcon,
  ClockIcon,
  CalendarIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';

// Define the Post interface
interface Post {
  _id: string;
  authorId: string;
  authorName: string;
  authorLodge: string;
  authorProfileImage?: string;
  content: string;
  images?: string[];
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: number;
  likes?: number;
  tags?: string[];
}

export default function PostsManagementPage() {
  const router = useRouter();
  
  // State for posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10);
  
  // State for user role and authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Check authentication and fetch posts
  useEffect(() => {
    // Check if user is authenticated using sessionStorage
    const authStatus = sessionStorage.getItem('isAuthenticated') === 'true';
    const role = sessionStorage.getItem('userRole');
    
    setIsAuthenticated(authStatus);
    setUserRole(role);
    
    if (!authStatus) {
      setError('You need to be logged in to view this page');
      setIsLoading(false);
      return;
    }
    
    // Check if user has super admin role
    if (role !== 'SUPER_ADMIN') {
      setError('You do not have permission to access the posts management page');
      setIsLoading(false);
      return;
    }
    
    // Fetch posts
    fetchPosts();
  }, []);
  
  // Function to fetch posts from the real API
  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setError('You need to be logged in to view this page');
        setIsLoading(false);
        return;
      }
      const response = await fetch('/api/posts?admin=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data.posts || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again later.');
      setIsLoading(false);
    }
  };
  
  // Function to reject a post
  const handleRejectPost = async (postId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
      }

      const token = sessionStorage.getItem('token');
      if (!token) {
        setError('You need to be logged in to delete posts');
        return;
      }

      const response = await fetch('/api/posts/admin/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete post');
      }

      // Remove the post from local state
      setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
      
      // Show success message
      alert('Post deleted successfully!');
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete post. Please try again.');
    }
  };
  
  // Function to delete a post (new function for explicit deletion)
  const handleDeletePost = async (postId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
      }

      const token = sessionStorage.getItem('token');
      if (!token) {
        setError('You need to be logged in to delete posts');
        return;
      }

      const response = await fetch('/api/posts/admin/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete post');
      }

      // Remove the post from local state
      setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
      
      // Show success message
      alert('Post deleted successfully!');
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete post. Please try again.');
    }
  };
  
  // Filter posts based on search query
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.authorLodge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    return matchesSearch;
  });
  
  // Sort posts based on sort order
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });
  
  // Pagination logic
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = sortedPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(sortedPosts.length / postsPerPage);
  
  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard/super-admin')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Posts Management</h1>
        <p className="text-gray-600 mt-2">Monitor and manage member posts. Posts are automatically approved but can be deleted if needed.</p>
      </div>
      
      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search posts, authors, or lodges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative inline-block">
              <select
                className="block appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm leading-5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ArrowPathIcon className="h-4 w-4" />
              </div>
            </div>
            
            <button
              onClick={fetchPosts}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Posts List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        {currentPosts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No posts found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPosts.map((post) => (
                  <tr key={post._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          {post.authorProfileImage ? (
                            <Image
                              src={post.authorProfileImage}
                              alt={post.authorName}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserCircleIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{post.authorName}</div>
                          <div className="text-sm text-gray-500">{post.authorLodge}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">{post.content}</div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {post.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {formatDate(post.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Post"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstPost + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(indexOfLastPost, sortedPosts.length)}
                </span>{' '}
                of <span className="font-medium">{sortedPosts.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                    currentPage === 1
                      ? 'text-gray-300'
                      : 'text-gray-400 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      page === currentPage
                        ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                    currentPage === totalPages
                      ? 'text-gray-300'
                      : 'text-gray-400 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* Posts Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Posts Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <UserCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Posts</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {posts.length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="rounded-full bg-gray-100 p-3 mr-4">
                <ClockIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Active Posts</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {posts.filter(post => post.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 