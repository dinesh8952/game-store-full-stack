import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [playMsg, setPlayMsg] = useState('');

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', id],
    queryFn: () => api.get(`/games/${id}`).then(r => r.data),
  });

  const handlePlay = async () => {
    setPlaying(true);
    setPlayMsg('');
    try {
      await api.post(`/games/${id}/play`);
      setPlayMsg('Play recorded! 🎮');
    } catch (err: any) {
      setPlayMsg(err.response?.data?.error || 'Failed to record play');
    } finally {
      setPlaying(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/games')} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
          ← Back to Games
        </button>
        <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-500 hover:text-gray-300 text-sm">
          Sign out
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <img
          src={game?.thumbnailUrl}
          alt={game?.name}
          className="w-full h-64 object-cover rounded-xl mb-6"
          onError={e => (e.currentTarget.src = 'https://picsum.photos/seed/game/800/400')}
        />
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">{game?.name}</h1>
            <span className="text-sm bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">{game?.genre}</span>
          </div>
          <div className="text-right text-gray-400 text-sm">
            <p>👥 {game?.maxPlayers} max players</p>
            <p>🎮 {game?.totalPlayCount} total plays</p>
          </div>
        </div>

        <p className="text-gray-400 mb-8">{game?.description}</p>

        {playMsg && (
          <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${playMsg.includes('🎮') ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {playMsg}
          </div>
        )}

        <button
          onClick={handlePlay}
          disabled={playing}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg transition"
        >
          {playing ? 'Loading...' : '🎮 Play Now'}
        </button>
      </div>
    </div>
  );
}
