import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  const stats = [
    { label: 'Total Users', value: data?.totalUsers ?? '—', color: 'text-blue-400' },
    { label: 'Pending Approval', value: data?.pendingUsers ?? '—', color: 'text-yellow-400' },
    { label: 'Approved Users', value: data?.approvedUsers ?? '—', color: 'text-green-400' },
    { label: 'Total Games', value: data?.totalGames ?? '—', color: 'text-indigo-400' },
    { label: 'Total Plays', value: data?.totalPlays ?? '—', color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-400">🛡️ Admin Panel</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/users')} className="text-gray-300 hover:text-white text-sm transition">Users</button>
          <button onClick={() => navigate('/admin/games')} className="text-gray-300 hover:text-white text-sm transition">Games</button>
          <button onClick={() => navigate('/games')} className="text-gray-300 hover:text-white text-sm transition">Browse Games</button>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-500 hover:text-gray-300 text-sm transition">Sign out</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        {isLoading ? (
          <div className="text-gray-400 text-center py-20">Loading stats...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map(s => (
              <div key={s.label} className="bg-gray-900 rounded-xl p-5 text-center">
                <p className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</p>
                <p className="text-gray-400 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl p-6 text-left transition"
          >
            <p className="text-lg font-semibold mb-1">👥 Manage Users</p>
            <p className="text-gray-400 text-sm">Approve or reject pending accounts</p>
          </button>
          <button
            onClick={() => navigate('/admin/games')}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl p-6 text-left transition"
          >
            <p className="text-lg font-semibold mb-1">🎮 Manage Games</p>
            <p className="text-gray-400 text-sm">Add, edit, or remove games</p>
          </button>
        </div>

        <section className="mt-8">
          <h3 className="text-xl font-bold mb-4">Top 5 Most Played Games</h3>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {data?.topGames?.length ? (
              <div className="divide-y divide-gray-800">
                {data.topGames.slice(0, 5).map((game: any, index: number) => (
                  <div key={game.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{game.name}</p>
                        <p className="text-gray-400 text-sm">{game.genre}</p>
                      </div>
                    </div>
                    <p className="text-purple-400 font-bold whitespace-nowrap">
                      {game.totalPlayCount} plays
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-10">No plays recorded yet</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
