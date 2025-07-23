'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, UserCircleIcon, MagnifyingGlassIcon, PlusIcon, ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Message {
  _id: string;
  id?: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderProfileImage?: string | null;
  recipientId: string;
  recipientName: string;
  recipientProfileImage?: string | null;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TokenData {
  userId: string;
  name: string;
  role: string;
}

export default function InboxPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [newMessage, setNewMessage] = useState({
    recipientId: '',
    subject: '',
    content: ''
  });
  const [selectedConversation, setSelectedConversation] = useState<{
    userId: string;
    userName: string;
    messages: Message[];
  } | null>(null);
  const [conversations, setConversations] = useState<{
    [key: string]: {
      userId: string;
      userName: string;
      messages: Message[];
      lastMessage: Message;
      unreadCount: number;
    };
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is authenticated using sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userData);
      setTokenData({
        userId: user._id,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
      return;
    }

    let isPolling = true;

    // Function to fetch messages
    const fetchMessages = async () => {
      if (!isPolling) return;
      
      try {
        console.log('Fetching messages for user:', tokenData?.userId);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('/api/messages', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        console.log('Fetched messages:', data.messages);
        
        // Ensure all messages have valid IDs
        const validMessages = (data.messages || []).map((message: any) => ({
          ...message,
          _id: message._id || message.id || `temp-${Date.now()}-${Math.random()}`
        }));
        
        // Update messages state
        setMessages(validMessages);
        
        // Organize messages into conversations
        if (validMessages.length > 0) {
          const organizedConversations: typeof conversations = {};
          
          validMessages.forEach((message: Message) => {
            // Get the other user's ID and name
            const otherUserId = message.senderId === tokenData?.userId ? message.recipientId : message.senderId;
            const otherUserName = message.senderId === tokenData?.userId ? message.recipientName : message.senderName;
            
            // Create a unique conversation key that's the same regardless of who sent/received
            // Sort the IDs to ensure consistent key regardless of sender/recipient
            const [id1, id2] = [tokenData?.userId, otherUserId].sort();
            const conversationKey = `${id1}_${id2}`;
            
            console.log('Message organization:', {
              messageId: message._id,
              senderId: message.senderId,
              recipientId: message.recipientId,
              currentUserId: tokenData?.userId,
              otherUserId,
              conversationKey
            });
          
            if (!organizedConversations[conversationKey]) {
              organizedConversations[conversationKey] = {
                userId: otherUserId,
                userName: otherUserName,
                messages: [],
                lastMessage: message,
                unreadCount: 0
              };
            }
            
            // Check if message already exists in the conversation
            const messageExists = organizedConversations[conversationKey].messages.some(
              existingMsg => existingMsg._id === message._id || existingMsg.id === message.id
            );
            
            if (!messageExists) {
              organizedConversations[conversationKey].messages.push(message);
            }
            
            // Update last message if this message is more recent
            if (new Date(message.timestamp) > new Date(organizedConversations[conversationKey].lastMessage.timestamp)) {
              organizedConversations[conversationKey].lastMessage = message;
            }
            
            // Update unread count
            if (!message.isRead && message.recipientId === tokenData?.userId) {
              organizedConversations[conversationKey].unreadCount++;
            }
          });
          
          // Sort messages within each conversation by timestamp
          Object.values(organizedConversations).forEach(conversation => {
            conversation.messages.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
          
          console.log('Organized conversations:', organizedConversations);
          setConversations(organizedConversations);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    // Function to fetch users
    const fetchUsers = async () => {
      try {
        console.log('Fetching users');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('/api/members', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        console.log('Fetched users:', data);
        setUsers(data.map((member: any) => ({
          id: member._id,
          name: member.name,
          email: member.email,
          role: member.role,
        })));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    // Initial fetch
    Promise.all([fetchMessages(), fetchUsers()]).finally(() => {
      setIsLoading(false);
    });

    // Set up polling interval
    const pollInterval = setInterval(fetchMessages, 5000); // Poll every 5 seconds

    // Cleanup on unmount
    return () => {
      isPolling = false;
      clearInterval(pollInterval);
    };
  }, [router]);

  // Separate useEffect for handling tokenData changes
  useEffect(() => {
    if (tokenData?.userId) {
      console.log('Token data updated, fetching messages for user:', tokenData.userId);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        setMessages(data.messages || []);
      })
      .catch(error => {
        console.error('Error fetching messages after token update:', error);
      });
    }
  }, [tokenData]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // No need to filter messages, as conversations are already filtered
    } else {
      // Filter conversations based on search query
      const filteredConversations = Object.values(conversations).filter(conversation => {
        return conversation.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               conversation.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase());
      });
      // Update conversations state with filtered results
      setConversations(prev => ({
        ...prev,
        ...filteredConversations.reduce((acc, conversation) => ({
          [conversation.userId]: conversation,
        }), {})
      }));
    }
  }, [searchQuery, conversations]);

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleMessageClick = (message: Message) => {
    console.log('Clicked message:', message);
    console.log('All messages:', messages);
    console.log('Current user ID:', tokenData?.userId);

    // Get the other user's ID (either sender or recipient)
    const otherUserId = message.senderId === tokenData?.userId ? message.recipientId : message.senderId;
    const otherUserName = message.senderId === tokenData?.userId ? message.recipientName : message.senderName;

    console.log('Other user ID:', otherUserId);
    console.log('Other user name:', otherUserName);

    // Filter messages to show conversation with this user
    const conversationMessages = messages.filter(msg => {
      const isFromCurrentUser = msg.senderId === tokenData?.userId;
      const isToCurrentUser = msg.recipientId === tokenData?.userId;
      const isFromOtherUser = msg.senderId === otherUserId;
      const isToOtherUser = msg.recipientId === otherUserId;

      console.log('Message check:', {
        messageId: msg.id,
        isFromCurrentUser,
        isToCurrentUser,
        isFromOtherUser,
        isToOtherUser,
        senderId: msg.senderId,
        recipientId: msg.recipientId
      });

      return (isFromCurrentUser && isToOtherUser) || (isFromOtherUser && isToCurrentUser);
    });

    console.log('Filtered conversation messages:', conversationMessages);

    // Sort messages by timestamp
    const sortedMessages = [...conversationMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log('Sorted conversation messages:', sortedMessages);

    setSelectedConversation({
      userId: otherUserId,
      userName: otherUserName,
      messages: sortedMessages
    });
    setSelectedMessage(message);
    
    // Mark as read if not already
    if (!message.isRead) {
      const updatedMessages = messages.map(msg => 
        msg.id === message.id ? { ...msg, isRead: true } : msg
      );
      setMessages(updatedMessages);
    }
  };

  const handleReply = async () => {
    if (!selectedConversation || !replyContent.trim()) return;
    
    try {
      console.log('Sending reply to:', selectedConversation);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: selectedConversation.userId,
          subject: `Re: ${selectedMessage?.subject || 'Message'}`,
          content: replyContent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      console.log('Reply sent successfully:', data);
      
      // Create a new message object for immediate UI update
      const newMessage: Message = {
        _id: data._id,
        senderId: tokenData?.userId || '',
        senderName: tokenData?.name || 'You',
        senderRole: tokenData?.role || '',
        recipientId: selectedConversation.userId,
        recipientName: selectedConversation.userName,
        subject: `Re: ${selectedMessage?.subject || 'Message'}`,
        content: replyContent,
        timestamp: new Date().toISOString(),
        isRead: true
      };

      // Update the selected conversation immediately
      setSelectedConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, newMessage]
        };
      });

      // Update the messages list
      setMessages(prev => [...prev, newMessage]);
      
      // Reset reply content
      setReplyContent('');
      
      // Refresh messages in the background
      const messagesResponse = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(`Failed to send reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendNewMessage = async () => {
    if (!newMessage.recipientId || !newMessage.subject.trim() || !newMessage.content.trim()) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      console.log('Sending new message:', newMessage);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: newMessage.recipientId,
          subject: newMessage.subject,
          content: newMessage.content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      console.log('Message sent successfully:', data);
      
      // Reset form
      setNewMessage({
        recipientId: '',
        subject: '',
        content: ''
      });
      setShowNewMessageForm(false);
      
      // Refresh messages
      const messagesResponse = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }
      
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteConversation = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Find the conversation key that contains this user
      const conversationKey = Object.keys(conversations).find(key => {
        const [user1, user2] = key.split('_');
        return user1 === userId || user2 === userId;
      });

      if (!conversationKey) {
        throw new Error('Conversation not found');
      }

      const messagesToDelete = conversations[conversationKey].messages;
      
      // Delete all messages in the conversation
      await Promise.all(messagesToDelete.map(async (message) => {
        const response = await fetch(`/api/messages/${message._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete message');
        }
      }));

      // Remove conversation from state
      setConversations(prev => {
        const newConversations = { ...prev };
        delete newConversations[conversationKey];
        return newConversations;
      });

      // If the deleted conversation was selected, clear the selection
      if (selectedConversation?.userId === userId) {
        setSelectedConversation(null);
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when conversation is selected or messages are updated
  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [selectedConversation?.messages]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            Connect with other members through private messages.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedMessage(null);
            setSelectedConversation(null);
            setShowNewMessageForm(!showNewMessageForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Message
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {showNewMessageForm ? (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Message</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                Recipient
              </label>
              <select
                id="recipient"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                value={newMessage.recipientId}
                onChange={(e) => setNewMessage({...newMessage, recipientId: e.target.value})}
              >
                <option value="">Select a recipient</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="content"
                rows={5}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                value={newMessage.content}
                onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewMessageForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNewMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      ) : selectedConversation ? (
        <div className="bg-white shadow-md rounded-lg flex flex-col h-[600px]">
          {/* Fixed Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <div className="flex items-center">
              <button
                onClick={() => {
                  setSelectedConversation(null);
                  setSelectedMessage(null);
                }}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {(() => {
                  const profileImage = selectedConversation.messages[0]?.senderId === tokenData?.userId 
                    ? selectedConversation.messages[0]?.recipientProfileImage
                    : selectedConversation.messages[0]?.senderProfileImage;
                  return profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={selectedConversation.userName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="h-6 w-6 text-gray-500" />
                  );
                })()}
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-medium text-gray-900">{selectedConversation.userName}</h2>
                <p className="text-sm text-gray-500">Active now</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedConversation(null);
                setSelectedMessage(null);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Scrollable Message Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[...selectedConversation.messages]
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map((message, index) => {
                const isCurrentUser = message.senderId === tokenData?.userId;
                const showAvatar = index === 0 || 
                  selectedConversation.messages[index - 1]?.senderId !== message.senderId;
                
                const messageKey = message._id || message.id || `temp-${index}-${message.timestamp}`;
                const profileImage = isCurrentUser 
                  ? message.senderProfileImage || undefined
                  : message.recipientProfileImage || undefined;
                
                return (
                  <div
                    key={messageKey}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-end space-x-2`}
                  >
                    {!isCurrentUser && showAvatar && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt={isCurrentUser ? message.senderName : message.recipientName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${isCurrentUser ? 'ml-2' : 'mr-2'}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isCurrentUser
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className={`text-xs text-gray-500 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                        {formatDate(message.timestamp)}
                      </div>
                    </div>
                    {isCurrentUser && showAvatar && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt={isCurrentUser ? message.senderName : message.recipientName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Footer with Message Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex items-center space-x-4">
              <textarea
                rows={1}
                className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 resize-none"
                placeholder="Type a message..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
              ></textarea>
              <button
                onClick={handleReply}
                className="inline-flex items-center justify-center p-2 rounded-full text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={!replyContent.trim()}
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {Object.keys(conversations).length === 0 ? (
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You have no messages in your inbox.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {Object.entries(conversations)
                .sort(([, a], [, b]) => 
                  new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
                )
                .map(([conversationKey, conversation]) => (
                  <li 
                    key={conversationKey}
                    className="hover:bg-gray-50 cursor-pointer group"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center flex-1"
                          onClick={() => {
                            setSelectedConversation({
                              userId: conversation.userId,
                              userName: conversation.userName,
                              messages: conversation.messages
                            });
                          }}
                        >
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {(() => {
                              const lastMessage = conversation.messages[conversation.messages.length - 1];
                              const profileImage = lastMessage.senderId === tokenData?.userId 
                                ? lastMessage.recipientProfileImage
                                : lastMessage.senderProfileImage;
                              return profileImage ? (
                                <img 
                                  src={profileImage} 
                                  alt={conversation.userName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <UserCircleIcon className="h-6 w-6 text-gray-500" />
                              );
                            })()}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">
                                {conversation.userName}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.lastMessage.content}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex items-center space-x-4">
                          <p className="text-sm text-gray-500">
                            {formatDate(conversation.lastMessage.timestamp)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conversation.userId);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600"
                            title="Delete conversation"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 