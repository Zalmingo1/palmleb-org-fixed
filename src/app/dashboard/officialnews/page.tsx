'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  date: string;
  author: string;
  imageUrl?: string;
  important: boolean;
}

export default function OfficialNewsPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Mock news data
  const newsItems: NewsItem[] = [
    {
      id: 1,
      title: 'Grand Master\'s Annual Address',
      content: 'The Grand Master has released his annual address to all lodges. The address focuses on the importance of brotherhood and community service in these challenging times.',
      date: 'Nov 15, 2023',
      author: 'Grand Master William Johnson',
      imageUrl: 'https://via.placeholder.com/800x400?text=Grand+Master+Address',
      important: true
    },
    {
      id: 2,
      title: 'Annual Convention Dates Announced',
      content: 'The dates for the annual convention have been announced. The convention will be held from March 15-17, 2024 at the Grand Lodge Hall. Registration will open on December 1, 2023.',
      date: 'Nov 10, 2023',
      author: 'Convention Committee',
      imageUrl: 'https://via.placeholder.com/800x400?text=Annual+Convention',
      important: false
    },
    {
      id: 3,
      title: 'New Educational Program Launched',
      content: 'The Grand Lodge has launched a new educational program for all members. The program includes online courses, webinars, and in-person workshops on various Masonic topics.',
      date: 'Nov 5, 2023',
      author: 'Education Committee',
      imageUrl: 'https://via.placeholder.com/800x400?text=Educational+Program',
      important: false
    },
    {
      id: 4,
      title: 'Charity Initiative Results',
      content: 'The results of our annual charity initiative have been announced. Thanks to the generous contributions of all members, we were able to raise $50,000 for the children\'s hospital.',
      date: 'Oct 28, 2023',
      author: 'Charity Committee',
      imageUrl: 'https://via.placeholder.com/800x400?text=Charity+Initiative',
      important: false
    },
    {
      id: 5,
      title: 'Important: Changes to Membership Dues',
      content: 'The Grand Lodge has approved changes to the membership dues structure. The new structure will take effect on January 1, 2024. Please read the full announcement for details.',
      date: 'Oct 20, 2023',
      author: 'Finance Committee',
      important: true
    }
  ];

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
          <h1 className="text-2xl font-montserrat font-bold mb-2">Official News</h1>
          <p className="text-gray-600 font-montserrat">Stay updated with important announcements</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-masonic-blue text-white rounded hover:bg-opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="space-y-6">
        {newsItems.map((item) => (
          <div 
            key={item.id} 
            className={`bg-white rounded-lg shadow-md overflow-hidden ${item.important ? 'border-l-4 border-masonic-gold' : ''}`}
          >
            {item.imageUrl && (
              <div className="relative h-48 w-full">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-montserrat font-bold">
                  {item.important && (
                    <span className="inline-block mr-2 bg-masonic-gold text-white text-xs px-2 py-1 rounded">
                      Important
                    </span>
                  )}
                  {item.title}
                </h2>
                <span className="text-sm text-gray-500">{item.date}</span>
              </div>
              <p className="text-gray-600 mb-4">{item.content}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">By: {item.author}</span>
                <button className="text-masonic-blue hover:underline">
                  Read More
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 