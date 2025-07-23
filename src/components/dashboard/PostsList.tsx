'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatBubbleLeftIcon, HeartIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface Post {
  _id: string;
  authorId: string;
  authorName: string;
  authorLodge: string | { _id: string; name: string; number: string };
  content: string;
  files: {
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  likes: number;
  comments: Array<{
    _id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
  }>;
  commentCount: number;
  likedBy: string[];
  liked: boolean;
  isAuthor: boolean;
}

interface User {
  _id: string;
  name: string;
}

export default function PostsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [user, setUser] = useState<User | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      console.log('Fetching posts...');
      setLoading(true);
      setError(null);

      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (!data.posts || !Array.isArray(data.posts)) {
        throw new Error('Invalid response format: posts array not found');
      }

      // Get current user ID from sessionStorage
      const userInfo = sessionStorage.getItem('user');
      let currentUserId = null;
      if (userInfo) {
        try {
          const parsedUser = JSON.parse(userInfo);
          currentUserId = parsedUser._id;
        } catch (e) {
          console.error('Error parsing user info:', e);
        }
      }

      // Process posts to set liked state
      const processedPosts = data.posts.map((post: Post) => ({
        ...post,
        liked: post.likedBy?.includes(currentUserId) || false
      }));

      console.log('Setting posts:', processedPosts.length);
      setPosts(processedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();

    const handlePostsUpdated = () => {
      console.log('Posts updated event received, refreshing posts');
      fetchPosts();
    };

    window.addEventListener('posts-updated', handlePostsUpdated);

    return () => {
      console.log('PostsList unmounting, removing event listener');
      window.removeEventListener('posts-updated', handlePostsUpdated);
    };
  }, [fetchPosts]);

  useEffect(() => {
    // Get user info from sessionStorage
    const userInfo = sessionStorage.getItem('user');
    console.log('User info from sessionStorage:', userInfo);
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        console.log('Parsed user:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing user info:', e);
      }
    }
  }, []);

  const handleLike = async (postId: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get current post state
      const currentPost = posts.find(p => p._id === postId);
      if (!currentPost) {
        throw new Error('Post not found');
      }

      console.log('Current post state:', {
        postId,
        currentLikes: currentPost.likes,
        isLiked: currentPost.liked
      });

      // Optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                liked: !post.liked, 
                likes: post.liked ? Math.max(0, post.likes - 1) : post.likes + 1 
              } 
            : post
        )
      );

      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Like response status:', response.status);
      const responseText = await response.text();
      console.log('Like response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          responseText,
          parsedData: data
        };
        console.error('Like request failed:', errorDetails);
        throw new Error(data?.message || data?.error || 'Failed to update like');
      }

      if (!data.post) {
        console.error('Invalid response data:', data);
        throw new Error('Invalid server response: missing post data');
      }

      const newLikeCount = Math.max(0, data.post.likes || 0);
      console.log('Updating post with new like count:', newLikeCount);
      
      // Update the post with the server response
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                likes: newLikeCount,
                liked: data.post.likedBy?.includes(user?._id) || false
              } 
            : post
        )
      );

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('posts-updated'));
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert the optimistic update on error
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                liked: !post.liked, 
                likes: Math.max(0, post.likes) // Ensure we don't go below 0
              } 
            : post
        )
      );
      alert(error instanceof Error ? error.message : 'Failed to update like');
    }
  };

  const handleEdit = async (postId: string, newContent: string) => {
    try {
      console.log('Editing post:', postId);
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to edit post');
      }

      // Update the local state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId 
            ? { ...post, content: newContent } 
            : post
        )
      );

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('posts-updated'));
    } catch (error) {
      console.error('Error editing post:', error);
      alert(error instanceof Error ? error.message : 'Failed to edit post');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      console.log('Deleting post:', postId);
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/posts/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId })
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          responseText,
          url: '/api/posts/delete',
          headers: Object.fromEntries(response.headers.entries()),
          requestBody: { postId }
        };
        console.error('Delete request failed:', errorDetails);
        throw new Error(`Failed to delete post: ${response.statusText} (${response.status})`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', {
          error: e,
          responseText,
          url: '/api/posts/delete'
        });
        throw new Error('Server returned invalid JSON response');
      }

      // Update the local state
      setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('posts-updated'));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete post');
    }
  };

  const handleComment = async (postId: string, content: string) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('Current user state:', user);
      if (!user) {
        throw new Error('User information not available');
      }

      // Optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            const newComment = {
              _id: new Date().getTime().toString(), // Temporary ID
              content,
              authorId: user._id,
              authorName: user.name,
              createdAt: new Date(),
            };
            console.log('Creating new comment with user info:', newComment);
            return {
              ...post,
              comments: [...(post.comments || []), newComment],
              commentCount: (post.commentCount || 0) + 1
            };
          }
          return post;
        })
      );

      console.log('Making comment request to:', `/api/posts/comment`);
      const response = await fetch(`/api/posts/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, postId })
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          responseText,
          url: `/api/posts/comment`,
          headers: Object.fromEntries(response.headers.entries()),
          requestBody: { content, postId }
        };
        console.error('Comment request failed:', errorDetails);
        throw new Error(`Failed to add comment: ${response.statusText} (${response.status})`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', {
          error: e,
          responseText,
          url: `/api/posts/comment`
        });
        throw new Error('Server returned invalid JSON response');
      }
      
      // Update with server response
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId ? data.post : post
        )
      );

      // Clear the comment form
      setCommentContent('');
      setCommentingPostId(null);

      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('postUpdated', { 
        detail: { postId, type: 'comment' }
      }));

    } catch (error) {
      console.error('Error adding comment:', error);
      // Revert optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            return {
              ...post,
              comments: post.comments?.filter(c => c._id !== new Date().getTime().toString()) || [],
              commentCount: Math.max(0, (post.commentCount || 0) - 1)
            };
          }
          return post;
        })
      );
      alert(error instanceof Error ? error.message : 'Failed to add comment');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-gray-500">No posts yet. Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <div key={post._id} className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                <span className="text-gray-500 text-lg font-medium">
                  {post.authorName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">{post.authorName || 'Unknown User'}</h3>
                <p className="text-xs text-gray-500">
                  {typeof post.authorLodge === 'object' ? post.authorLodge?.name || 'Unknown Lodge' : post.authorLodge || 'Unknown Lodge'} • {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {/* Edit and Delete buttons - only show for the post author */}
            {post.isAuthor && (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const newContent = prompt('Edit your post:', post.content);
                    if (newContent !== null && newContent.trim() !== '') {
                      handleEdit(post._id, newContent);
                    }
                  }}
                  className="text-gray-500 hover:text-blue-600"
                  title="Edit post"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(post._id)}
                  className="text-gray-500 hover:text-red-600"
                  title="Delete post"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <p className="text-gray-800 mb-4">{post.content}</p>
          
          {/* Display files if any */}
          {post.files && post.files.length > 0 && (
            <div className="mb-4">
              {post.files.map((file, index) => (
                <div key={index} className="mb-2">
                  {file.type.startsWith('image/') ? (
                    <img 
                      src={file.url} 
                      alt={file.name}
                      className="max-w-full h-auto rounded-lg"
                    />
                  ) : (
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {file.name}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center text-gray-500 text-sm">
            <button 
              onClick={() => handleLike(post._id)}
              className="flex items-center mr-4 hover:text-blue-600"
            >
              {post.liked ? (
                <HeartIconSolid className="h-5 w-5 text-red-500 mr-1" />
              ) : (
                <HeartIcon className="h-5 w-5 mr-1" />
              )}
              {post.likes}
            </button>
            <button 
              onClick={() => setCommentingPostId(commentingPostId === post._id ? null : post._id)}
              className="flex items-center hover:text-blue-600"
            >
              <ChatBubbleLeftIcon className="h-5 w-5 mr-1" />
              {post.comments.length}
            </button>
          </div>

          {/* Comment form */}
          {commentingPostId === post._id && (
            <div className="mt-4 border-t pt-4">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                rows={2}
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={() => {
                    setCommentingPostId(null);
                    setCommentContent('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (commentContent.trim()) {
                      handleComment(post._id, commentContent);
                    }
                  }}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Comment
                </button>
              </div>
            </div>
          )}

          {/* Display comments */}
          {post.comments && post.comments.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Comments</h4>
              <div className="space-y-3">
                {post.comments.map((comment: any) => (
                  <div key={comment._id} className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-500 text-sm font-medium">
                        {comment.authorName?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">
                        {comment.authorName || 'Unknown'} • {new Date(comment.createdAt).toLocaleString()}
                      </p>
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-sm text-gray-900">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 