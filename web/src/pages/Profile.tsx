import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, MapPin, Store, LogOut } from 'lucide-react';

export function Profile() {
  const { session, owner, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    username: owner?.username || session?.user?.user_metadata?.username || '',
    shop_name: owner?.shop_name || 'My Store',
    location: owner?.location || 'Mumbai, IN',
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      data: { username: formData.username }
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Profile updated successfully!');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary mb-8">Store Profile</h1>

      <div className="glass p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-primary"></div>
        
        <div className="relative z-10 flex flex-col items-center mt-12 mb-8">
          <div className="w-24 h-24 bg-accent text-white rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white shadow-lg">
            {formData.username.charAt(0).toUpperCase() || 'U'}
          </div>
          <h2 className="text-2xl font-bold text-textPrimary mt-4">{formData.username}</h2>
          <p className="text-textSecondary flex items-center mt-1">
            <Store className="w-4 h-4 mr-1" /> {formData.shop_name}
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-semibold ${message.includes('Error') ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6 max-w-md mx-auto">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Owner Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
              <input 
                type="text" 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border focus:border-primary outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Shop Name</label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
              <input 
                type="text" 
                value={formData.shop_name}
                onChange={e => setFormData({...formData, shop_name: e.target.value})}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border focus:border-primary outline-none" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Location</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
              <input 
                type="text" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border focus:border-primary outline-none" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-border flex justify-center">
          <button 
            onClick={() => signOut()}
            className="flex items-center space-x-2 px-6 py-3 text-danger font-semibold rounded-xl hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
