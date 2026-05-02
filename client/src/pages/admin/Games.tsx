import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const GENRES = ['ACTION', 'ADVENTURE', 'PUZZLE', 'STRATEGY', 'SPORTS', 'RPG', 'SIMULATION', 'OTHER'];

const EMPTY = { name: '', description: '', genre: 'ACTION', thumbnailUrl: '', maxPlayers: 4, isActive: true };

export default function AdminGames() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [formErr, setFormErr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-games', page],
    queryFn: () => api.get(`/admin/games?page=${page}`).then(r => r.data),
  });

  const createGame = useMutation({
    mutationFn: (body: any) => api.post('/admin/games', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-games'] }); closeForm(); },
    onError: (err: any) => setFormErr(err.response?.data?.error || 'Failed to create game'),
  });

  const updateGame = useMutation({
    mutationFn: ({ id, body }: any) => api.put(`/admin/games/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-games'] }); closeForm(); },
    onError: (err: any) => setFormErr(err.response?.data?.error || 'Failed to update game'),
  });

  const deleteGame = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/games/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-games'] }),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFormErr(''); setShowForm(true); };
  const openEdit = (g: any) => {
    setEditing(g);
    setForm({ name: g.name, description: g.description, genre: g.genre, thumbnailUrl: g.thumbnailUrl || '', maxPlayers: g.maxPlayers, isActive: g.isActive });
    setFormErr('');
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setFormErr(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...form, maxPlayers: Number(form.maxPlayers), isActive: (form as any).isActive };
    if (editing) updateGame.mutate({ id: editing.id, body });
    else createGame.mutate(body);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-indigo-400 hover:text-indigo-300 text-sm">← Dashboard</button>
          <h1 className="text-xl font-bold">Games</h1>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-500 hover:text-gray-300 text-sm">Sign out</button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Manage Games</h2>
          <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            + Add Game
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
              <h3 className="text-xl font-bold mb-4">{editing ? 'Edit Game' : 'Add Game'}</h3>
              {formErr && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{formErr}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                    placeholder="Game name" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Game description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Genre</label>
                    <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500">
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Players</label>
                    <input type="number" required min={1} max={100} value={form.maxPlayers}
                      onChange={e => setForm({ ...form, maxPlayers: Number(e.target.value) })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Thumbnail URL</label>
                  <input value={form.thumbnailUrl} onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                    placeholder="https://..." />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">Active</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !(form as any).isActive })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${ (form as any).isActive ? 'bg-indigo-600' : 'bg-gray-600' }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ (form as any).isActive ? 'translate-x-5' : 'translate-x-0' }`} />
                  </button>
                  <span className="text-xs text-gray-500">{(form as any).isActive ? 'Visible to users' : 'Hidden from users'}</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={createGame.isPending || updateGame.isPending}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition">
                    {editing ? 'Save Changes' : 'Create Game'}
                  </button>
                  <button type="button" onClick={closeForm}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-gray-400 text-center py-20">Loading games...</div>
        ) : (
          <div className="space-y-3">
            {data?.games?.map((g: any) => (
              <div key={g.id} className="bg-gray-900 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4">
                  <img src={g.thumbnailUrl} alt={g.name} className="w-14 h-10 object-cover rounded-lg"
                    onError={e => (e.currentTarget.src = 'https://picsum.photos/seed/game/100/70')} />
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-gray-400 text-sm">{g.genre} · {g.maxPlayers} players · {g.totalPlayCount} plays</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${g.isActive ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {g.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => openEdit(g)}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-lg transition">
                    Edit
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${g.name}"?`)) deleteGame.mutate(g.id); }}
                    className="bg-red-600/70 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!data?.games?.length && <div className="text-gray-400 text-center py-20">No games found</div>}
          </div>
        )}

        {data?.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-lg transition ${p === page ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
