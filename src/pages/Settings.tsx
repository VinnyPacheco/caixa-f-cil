import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import { useNotificationSettings } from '@/contexts/NotificationSettingsContext';
import { useProfile } from '@/hooks/useProfile';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { fetchProfile, updateProfile, uploadAvatar } from '@/services/profileService';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { autoSaveVoiceTransaction, setAutoSaveVoiceTransaction } = useVoiceSettings();
  const { notificationsEnabled, setNotificationsEnabled } = useNotificationSettings();
  const { displayName } = useProfile();
  const { isInstallable, isInstalled, promptInstall, showIOSInstructions } = usePWAInstall();
  
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    const profile = await fetchProfile(user.id);
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setIsLoading(true);
      const publicUrl = await uploadAvatar(user.id, file);
      await updateProfile(user.id, { avatar_url: publicUrl });
      setAvatarUrl(publicUrl);
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar foto');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSave = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      await updateProfile(user.id, { full_name: fullName });
      setIsEditingName(false);
      toast.success('Nome atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar nome');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppLayout>
      <Header showAvatar showNotification userName={displayName} />

      <main className="flex flex-col gap-6 p-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleAvatarClick}
            disabled={isLoading}
            className="relative group"
          >
            <Avatar className="size-28 border-4 border-accent/20">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Foto de perfil" />
              ) : null}
              <AvatarFallback className="text-2xl bg-accent/10 text-accent">
                {fullName ? getInitials(fullName) : <span className="material-symbols-outlined text-4xl">person</span>}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground">Toque para alterar a foto</p>
        </div>

        {/* Full Name Field */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden p-4">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Nome Completo
          </label>
          <div className="flex items-center gap-2 mt-2">
            {isEditingName ? (
              <>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex-1"
                  placeholder="Digite seu nome completo"
                />
                <button
                  onClick={handleNameSave}
                  disabled={isLoading}
                  className="size-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">check</span>
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </>
            ) : (
              <>
                <p className="flex-1 text-foreground font-medium">
                  {fullName || 'Não informado'}
                </p>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="size-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Settings Items */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
          {/* Notifications Toggle */}
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className={`size-10 rounded-xl flex items-center justify-center ${
              notificationsEnabled ? 'bg-green-500/10' : 'bg-destructive/10'
            }`}>
              <span 
                className={`material-symbols-outlined ${
                  notificationsEnabled ? 'text-green-500' : 'text-destructive'
                }`}
              >
                notifications
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-foreground">Notificações</p>
              <p className="text-sm text-muted-foreground">Alertas e lembretes</p>
            </div>
          </button>

          {/* Voice Auto-Save Toggle */}
          <button
            onClick={() => setAutoSaveVoiceTransaction(!autoSaveVoiceTransaction)}
            className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className={`size-10 rounded-xl flex items-center justify-center ${
              autoSaveVoiceTransaction ? 'bg-green-500/10' : 'bg-destructive/10'
            }`}>
              <span 
                className={`material-symbols-outlined ${
                  autoSaveVoiceTransaction ? 'text-green-500' : 'text-destructive'
                }`}
              >
                mic
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-foreground">Lançamento automático por áudio</p>
              <p className="text-sm text-muted-foreground">Salvar automaticamente quando usar voz</p>
            </div>
          </button>

          {/* Security */}
          <button
            onClick={() => navigate('/security')}
            className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-accent">security</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-foreground">Segurança</p>
              <p className="text-sm text-muted-foreground">Senha e autenticação</p>
            </div>
            <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
          </button>

          {/* PWA Install */}
          {isInstalled ? (
            <div className="w-full flex items-center gap-4 p-4">
              <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500">install_mobile</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">App Instalado</p>
                <p className="text-sm text-muted-foreground">Você está usando a versão instalada</p>
              </div>
              <span className="material-symbols-outlined text-green-500">check_circle</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={async () => {
                const success = await promptInstall();
                if (success) {
                  toast.success('App instalado com sucesso!');
                }
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-accent">install_mobile</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Instalar App</p>
                <p className="text-sm text-muted-foreground">Adicione à tela inicial</p>
              </div>
              <span className="material-symbols-outlined text-accent">download</span>
            </button>
          ) : (
            <div className="w-full flex items-center gap-4 p-4">
              <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-accent">install_mobile</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Instalar App</p>
                <p className="text-sm text-muted-foreground">
                  {showIOSInstructions 
                    ? <>Toque em <span className="material-symbols-outlined text-xs align-middle">ios_share</span> e "Adicionar à Tela de Início"</>
                    : "Acesse pelo navegador para instalar"
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* About Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
            Sobre
          </h3>
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
            <button
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-accent">help</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Ajuda</p>
                <p className="text-sm text-muted-foreground">Central de ajuda e FAQ</p>
              </div>
              <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
            </button>
            <button
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-accent">info</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Sobre o App</p>
                <p className="text-sm text-muted-foreground">Versão e informações legais</p>
              </div>
              <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20 transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          Sair da Conta
        </button>
      </main>
    </AppLayout>
  );
}
