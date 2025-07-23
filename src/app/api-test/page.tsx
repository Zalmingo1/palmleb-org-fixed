'use client';

import { useState } from 'react';

export default function ApiTestPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [loginResult, setLoginResult] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const checkTestEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const checkLoginEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      setLoginResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setLoginResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Test API Endpoint</h2>
        <button 
          onClick={checkTestEndpoint}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Test /api/test endpoint'}
        </button>
        
        {testResult && (
          <div className="mt-4">
            <h3 className="font-semibold">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto max-h-40">
              {testResult}
            </pre>
          </div>
        )}
      </div>
      
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Test Login Endpoint</h2>
        <form onSubmit={checkLoginEndpoint} className="space-y-4">
          <div>
            <label className="block mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Test /api/auth/login endpoint'}
          </button>
        </form>
        
        {loginResult && (
          <div className="mt-4">
            <h3 className="font-semibold">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto max-h-40">
              {loginResult}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <a href="/login" className="text-blue-500 underline">Go to regular login page</a>
      </div>
    </div>
  );
} 