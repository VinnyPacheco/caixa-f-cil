import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProfile, Profile } from '@/services/profileService';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const data = await fetchProfile(user.id);
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return {
    profile,
    displayName,
    isLoading,
    refetch: loadProfile,
  };
}
