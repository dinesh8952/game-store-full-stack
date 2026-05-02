import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const GENRES = ['', 'ACTION', 'ADVENTURE', 'PUZZLE', 'STRATEGY', 'SPORTS', 'RPG', 'SIMULATION', 'OTHER'];

export default function Games() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [genre, setGenre] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['games', page, genre],
    queryFn: () => api.get(`/games?page=${page}${genre ? `&genre=${genre}` : ''}`).then(r => r.data),
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-400">🎮 Game Store</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user?.email}</span>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-gray-500 hover:text-gray-300 text-sm transition"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Browse Games</h2>
          <select
            value={genre}
            onChange={e => { setGenre(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
          >
            {GENRES.map(g => <option key={g} value={g}>{g || 'All Genres'}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 py-20">Loading games...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.games?.map((game: any) => (
                <div
                  key={game.id}
                  onClick={() => navigate(`/games/${game.id}`)}
                  className="bg-gray-900 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition group"
                >
                  <img
                    src={game.thumbnailUrl}
                    alt={game.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
                    onError={e => (e.currentTarget.src = 'https://picsum.photos/seed/game/400/300')}
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white">{game.name}</h3>
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{game.genre}</span>
                    </div>
                    <p className="text-gray-400 text-sm">👥 {game.maxPlayers} players · 🎮 {game.totalPlayCount} plays</p>
                  </div>
                </div>
              ))}
            </div>

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
          </>
        )}
      </div>
    </div>
  );
}
