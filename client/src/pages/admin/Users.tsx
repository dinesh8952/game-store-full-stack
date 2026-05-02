import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-300',
  APPROVED: 'bg-green-500/20 text-green-300',
  REJECTED: 'bg-red-500/20 text-red-300',
};

export default function AdminUsers() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [actionMsg, setActionMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, status],
    queryFn: () => api.get(`/admin/users?page=${page}${status ? `&status=${status}` : ''}`).then(r => r.data),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/approve`),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setActionMsg({ id, msg: 'Approved', ok: true }); },
    onError: (err: any, id) => setActionMsg({ id, msg: err.response?.data?.error || 'Failed', ok: false }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reject`),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setActionMsg({ id, msg: 'Rejected', ok: false }); },
    onError: (err: any, id) => setActionMsg({ id, msg: err.response?.data?.error || 'Failed', ok: false }),
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-indigo-400 hover:text-indigo-300 text-sm">← Dashboard</button>
          <h1 className="text-xl font-bold">Users</h1>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-500 hover:text-gray-300 text-sm">Sign out</button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Manage Users</h2>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-gray-400 text-center py-20">Loading users...</div>
        ) : (
          <div className="space-y-3">
            {data?.users?.map((u: any) => (
              <div key={u.id} className="bg-gray-900 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold">{u.email}</p>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {u.profile?.firstName
                      ? `${u.profile.firstName} ${u.profile.lastName} · ${u.profile.phone}`
                      : 'Profile not completed'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[u.status]}`}>
                    {u.status}
                  </span>
                  {u.status === 'PENDING' && u.profileComplete && (
                    <button
                      onClick={() => approve.mutate(u.id)}
                      disabled={approve.isPending}
                      className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition"
                    >
                      Approve
                    </button>
                  )}
                  {u.status === 'PENDING' && (
                    <button
                      onClick={() => reject.mutate(u.id)}
                      disabled={reject.isPending}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition"
                    >
                      Reject
                    </button>
                  )}
                  {actionMsg?.id === u.id && actionMsg && (
                    <span className={`text-xs ${actionMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{actionMsg.msg}</span>
                  )}
                </div>
              </div>
            ))}
            {!data?.users?.length && (
              <div className="text-gray-400 text-center py-20">No users found</div>
            )}
          </div>
        )}

        {data?.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-lg transition ${p === page ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
