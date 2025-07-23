'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

// Extend Window interface to include our custom property
declare global {
  interface Window {
    eventSource?: EventSource;
  }
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: ''
  });
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchContacts();
    setupSSE();
    return () => {
      // Cleanup SSE connection when component unmounts
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
    }
  }, [selectedContact]);

  const setupSSE = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('Setting up SSE connection...');
    
    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log('Closing existing SSE connection...');
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/messages?sse=true&token=${token}`);
    console.log('SSE connection created');

    eventSource.onopen = () => {
      console.log('SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      console.log('SSE message received:', event.data);
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        console.log('New message received:', data.message);
        // If the message is from the currently selected contact, add it to the messages
        if (selectedContact && data.message.senderId.toString() === selectedContact.id) {
          console.log('Adding message to current conversation');
          setMessages(prev => [data.message, ...prev]);
        } else {
          console.log('Message not from current contact, refreshing contacts');
        }
        // Refresh contacts to update last message and unread count
        fetchContacts();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      // Close the current connection
      eventSource.close();
      // Try to reconnect after a short delay
      console.log('Attempting to reconnect SSE in 1 second...');
      setTimeout(() => {
        setupSSE();
      }, 1000);
    };

    // Store the EventSource instance for cleanup
    eventSourceRef.current = eventSource;
  };

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const data = await response.json();
      setContacts(data.contacts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      console.log('Fetching messages for contact:', contactId);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/messages?contactId=${contactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      console.log('Fetched messages:', data.messages);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newMessage.subject || !newMessage.content) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: selectedContact.id,
          subject: newMessage.subject,
          content: newMessage.content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add the new message to the messages list
      setMessages(prev => [data.message, ...prev]);
      
      // Reset form and close compose modal
      setNewMessage({ subject: '', content: '' });
      setShowCompose(false);
      
      // Refresh contacts to update last message
      fetchContacts();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-masonic-blue"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-montserrat font-bold mb-2">Messages</h1>
          <p className="text-gray-600 font-montserrat">Stay connected with your lodge members</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-masonic-blue text-white rounded hover:bg-opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contacts List */}
        <div className="md:col-span-1 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-masonic-blue text-white p-4 flex justify-between items-center">
            <h2 className="text-xl font-montserrat font-bold">Contacts</h2>
            <button 
              onClick={() => setShowCompose(true)}
              className="px-4 py-2 bg-white text-masonic-blue rounded hover:bg-gray-100"
            >
              New Message
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{contact.name}</h3>
                    <p className="text-sm text-gray-500">{contact.role}</p>
                  </div>
                  {contact.unreadCount > 0 && (
                    <span className="bg-masonic-blue text-white text-xs px-2 py-1 rounded-full">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
                {contact.lastMessage && (
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {contact.lastMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
          {selectedContact ? (
            <>
              <div className="bg-masonic-blue text-white p-4">
                <h2 className="text-xl font-montserrat font-bold">
                  Conversation with {selectedContact.name}
                </h2>
              </div>
              <div className="h-[600px] overflow-y-auto p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 ${
                      message.senderId.toString() === selectedContact?.id ? 'ml-0' : 'ml-auto'
                    } max-w-[80%]`}
                  >
                    <div
                      className={`rounded-lg p-4 ${
                        message.senderId.toString() === selectedContact?.id
                          ? 'bg-gray-100'
                          : 'bg-masonic-blue text-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">
                          {message.senderName}
                        </span>
                        <span className="text-sm opacity-75">
                          {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <h3 className="font-medium mb-2">{message.subject}</h3>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[600px] flex items-center justify-center text-gray-500">
              Select a contact to view messages
            </div>
          )}
        </div>
      </div>

      {/* Compose Message Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">New Message</h3>
            </div>
            <form onSubmit={handleSendMessage} className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To: {selectedContact?.name}
                </label>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md h-32"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-masonic-blue text-white rounded hover:bg-opacity-90"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 