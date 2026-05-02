import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export default function Rejected() {
  const { logout, updateUser, user } = useAuth();
  const navigate = useNavigate();

  // Poll for user status changes
  const { data } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then(r => r.data),
    refetchInterval: 3000,
    enabled: !!user,
  });

  useEffect(() => {
    if (data) {
      updateUser(data);
      if (data.status === 'APPROVED') {
        navigate('/games');
      } else if (data.status === 'PENDING') {
        navigate('/pending');
      }
    }
  }, [data, navigate, updateUser]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-2xl text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-white mb-3">Account Rejected</h1>
        <p className="text-gray-400 mb-8">
          Your account has been rejected. Please contact support for more information.
        </p>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="text-gray-500 hover:text-gray-300 text-sm transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
