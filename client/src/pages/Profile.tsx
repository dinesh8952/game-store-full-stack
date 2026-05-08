import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Country, State } from 'country-state-city';

const VALID_COUNTRY_CODES = new Set([
  'IN', 'US', 'GB', 'AU', 'CA', 'SG', 'AE', 'DE', 'FR', 'JP', 'NZ', 'NL', 'SE', 'NO', 'DK', 'FI', 'CH', 'BR', 'ZA', 'NG',
]);

const COUNTRIES = Country.getAllCountries()
  .filter(country => VALID_COUNTRY_CODES.has(country.isoCode))
  .map(country => ({ code: country.isoCode, name: country.name }));

export default function Profile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '',
    address: '', city: '', state: '', country: '',
  });
  const states = form.country ? State.getStatesOfCountry(form.country) : [];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/profile', form);
      navigate('/pending');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      <input
        required
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Complete your profile</h1>
        <p className="text-gray-400 mb-8">Fill in your details to request access</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {field('firstName', 'First Name', 'Ravi')}
            {field('lastName', 'Last Name', 'Kumar')}
          </div>
          {field('phone', 'Phone', '9999999999')}
          {field('address', 'Address', '123 Main Street')}
          <div className="grid grid-cols-2 gap-4">
            {field('city', 'City', 'Hyderabad')}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">State</label>
              <select
                required
                value={form.state}
                disabled={!form.country || states.length === 0}
                onChange={e => setForm({ ...form, state: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition disabled:opacity-60"
              >
                <option value="">{form.country ? 'Select a state' : 'Select country first'}</option>
                {states.map(s => (
                  <option key={s.isoCode} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Country</label>
            <select
              required
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value, state: '' })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">Select a country</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
