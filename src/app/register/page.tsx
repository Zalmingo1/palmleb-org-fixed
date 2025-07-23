'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'LODGE_MEMBER',
    lodgeId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lodges, setLodges] = useState<{ id: string; name: string; number: string }[]>([]);
  const [loadingLodges, setLoadingLodges] = useState(true);
  const router = useRouter();

  // Fetch lodges on component mount
  useEffect(() => {
    const fetchLodges = async () => {
      try {
        // In a real implementation, this would call an API endpoint
        // For now, we'll just simulate some lodges
        setTimeout(() => {
          setLodges([
            { id: '1', name: 'Example Lodge', number: '123' },
            { id: '2', name: 'Test Lodge', number: '456' },
            { id: '3', name: 'Demo Lodge', number: '789' },
          ]);
          setLoadingLodges(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching lodges:', err);
        setLoadingLodges(false);
      }
    };

    fetchLodges();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate form
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Call the register API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          lodgeId: formData.lodgeId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      // After successful registration, log the user in
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        // Registration was successful, but login failed
        // Redirect to login page
        router.push('/login');
        return;
      }

      // Store token in cookies
      Cookies.set('token', loginData.token, { expires: 1 }); // Expires in 1 day
      
      // Store user data in localStorage for easy access
      localStorage.setItem('user', JSON.stringify(loginData.user));
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-masonic-blue mb-2">Freemasons Community</h1>
          <p className="text-gray-600">Create a new account</p>
        </div>

        <div className="card bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-masonic-blue focus:border-masonic-blue"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-masonic-blue focus:border-masonic-blue"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-masonic-blue focus:border-masonic-blue"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-masonic-blue focus:border-masonic-blue"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-masonic-blue focus:border-masonic-blue"
              >
                <option value="LODGE_MEMBER">Lodge Member</option>
                
                <option value="DISTRICT_ADMIN">District Administrator</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Note: Role selection is for demonstration purposes. In a real application, roles would be assigned by administrators.
              </p>
            </div>

            <div>
              <label htmlFor="lodgeId" className="block text-sm font-medium text-gray-700 mb-1">
                Lodge (Optional)
              </label>
              <select
                id="lodgeId"
                name="lodgeId"
                value={formData.lodgeId}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-masonic-blue focus:border-masonic-blue"
              >
                <option value="">Select a lodge</option>
                {loadingLodges ? (
                  <option disabled>Loading lodges...</option>
                ) : (
                  lodges.map(lodge => (
                    <option key={lodge.id} value={lodge.id}>
                      {lodge.name} (#{lodge.number})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-masonic-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-masonic-blue"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-masonic-blue hover:text-masonic-blue">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 