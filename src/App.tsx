import React, { useState, useEffect } from 'react';
import Profile from './components/Profile';
import FAQ from './components/FAQ';
import NSAssistant from './components/NSAssistant';
import Social from './components/Social';
import { INITIAL_USER, ALL_BADGES, EXISTING_USERNAMES } from './data/mockData';
import { User, Group, GroupInvitation } from './types';
import { LayoutDashboard, User as UserIcon, HelpCircle, Bell, MessageSquare, Menu, X, ArrowRight, Users, Globe, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslation, Language } from './translations';

const LANGUAGES = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-US', name: 'English (USA)', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
] as const;

type LanguageCode = typeof LANGUAGES[number]['code'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'settings' | 'faq' | 'assistant' | 'social'>('assistant');
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'general'>('profile');
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USER);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isWelcomeScreenVisible, setIsWelcomeScreenVisible] = useState(true);
  const [welcomeName, setWelcomeName] = useState('');
  const [welcomePassword, setWelcomePassword] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [isPasswordStep, setIsPasswordStep] = useState(false);
  const [isLanguageStep, setIsLanguageStep] = useState(true);
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('ns_lang');
    return (saved as LanguageCode) || 'it';
  });
  const [loginError, setLoginError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [allGroups, setAllGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem('ns_groups');
    return saved ? JSON.parse(saved) : [];
  });
  const [allInvites, setAllInvites] = useState<Record<string, GroupInvitation[]>>(() => {
    const saved = localStorage.getItem('ns_invites');
    return saved ? JSON.parse(saved) : {};
  });

  // Persistence (Simulated with LocalStorage)
  const [registeredUsers, setRegisteredUsers] = useState<Record<string, User>>(() => {
    const saved = localStorage.getItem('ns_users');
    if (saved) return JSON.parse(saved);
    return {
      'studente_curioso': { ...INITIAL_USER, username: 'studente_curioso', password: 'password123' }
    };
  });

  useEffect(() => {
    localStorage.setItem('ns_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    localStorage.setItem('ns_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('ns_groups', JSON.stringify(allGroups));
  }, [allGroups]);

  useEffect(() => {
    localStorage.setItem('ns_invites', JSON.stringify(allInvites));
  }, [allInvites]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const t = (key: any) => getTranslation(language, key);

  const validateUsername = (name: string) => {
    const regex = /^[a-zA-Z0-9._]+$/;
    return regex.test(name);
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = welcomeName.trim().toLowerCase();
    if (!name) return;
    
    if (!validateUsername(name)) {
      setLoginError('Il nome utente può contenere solo lettere, numeri, punti e trattini bassi.');
      return;
    }

    setIsExistingUser(!!registeredUsers[name]);
    setLoginError('');
    setIsPasswordStep(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = welcomeName.toLowerCase();
    
    if (isExistingUser) {
      if (registeredUsers[name].password === welcomePassword) {
        const user = registeredUsers[name];
        // Migration: ensure friends array exists
        if (!user.friends) user.friends = [];
        setCurrentUser(user);
        setIsWelcomeScreenVisible(false);
      } else {
        setLoginError('Password errata.');
      }
    } else {
      const newUser: User = { 
        ...INITIAL_USER, 
        username: welcomeName.trim(), 
        password: welcomePassword,
        id: Math.random().toString(36).substr(2, 9), 
        points: 0, 
        badges: [],
        themeColor: 'indigo',
        friends: []
      };
      setRegisteredUsers(prev => ({ ...prev, [name]: newUser }));
      setCurrentUser(newUser);
      setIsWelcomeScreenVisible(false);
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setRegisteredUsers(prev => ({
      ...prev,
      [updatedUser.username.toLowerCase()]: updatedUser
    }));
    addNotification('Profilo aggiornato con successo!');
  };

  const handleEarnPoints = (points: number, reason: string) => {
    setCurrentUser(prev => {
      const newPoints = prev.points + points;
      addNotification(`Hai guadagnato ${points} punti: ${reason}`);

      return {
        ...prev,
        points: newPoints
      };
    });
  };

  const unlockBadge = (badgeId: string) => {
    setCurrentUser(prev => {
      if (prev.badges.find(b => b.id === badgeId)) return prev;
      
      const badge = ALL_BADGES.find(b => b.id === badgeId);
      if (!badge) return prev;

      const newBadges = [...prev.badges, { ...badge, unlockedAt: new Date().toISOString() }];
      addNotification(`🎉 Nuovo Badge Sbloccato: ${badge.name}!`);
      
      return { ...prev, badges: newBadges };
    });
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 3));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== msg));
    }, 3000);
  };

  // Social Handlers
  const handleCreateGroup = (newGroup: Group, inviteUsernames: string[]) => {
    setAllGroups(prev => [...prev, newGroup]);
    
    // Send invites
    inviteUsernames.forEach(username => {
      const target = username.toLowerCase();
      const invite: GroupInvitation = {
        id: Math.random().toString(36).substr(2, 9),
        groupId: newGroup.id,
        groupName: newGroup.name,
        invitedBy: currentUser.username,
        status: 'pending'
      };
      setAllInvites(prev => ({
        ...prev,
        [target]: [...(prev[target] || []), invite]
      }));
    });
    addNotification(`Gruppo "${newGroup.name}" creato!`);
    unlockBadge('b1'); // Primo Passo: Hai creato il tuo primo gruppo
  };

  const handleAcceptInvite = (invite: GroupInvitation) => {
    setAllGroups(prev => {
      const updated = prev.map(g => {
        if (g.id === invite.groupId) {
          return { ...g, members: [...g.members, currentUser.username] };
        }
        return g;
      });
      
      // Check for Socializzatore badge (joined 3 groups)
      const joinedCount = updated.filter(g => g.members.includes(currentUser.username)).length;
      if (joinedCount >= 3) {
        unlockBadge('b5');
      }
      
      return updated;
    });

    setAllInvites(prev => ({
      ...prev,
      [currentUser.username.toLowerCase()]: prev[currentUser.username.toLowerCase()].filter(i => i.id !== invite.id)
    }));
    addNotification(`Sei entrato nel gruppo "${invite.groupName}"`);
  };

  const handleDeclineInvite = (invite: GroupInvitation) => {
    setAllInvites(prev => ({
      ...prev,
      [currentUser.username.toLowerCase()]: prev[currentUser.username.toLowerCase()].filter(i => i.id !== invite.id)
    }));
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = allGroups.find(g => g.id === groupId);
    if (group && group.createdBy === currentUser.username) {
      if (window.confirm(`Sei sicuro di voler eliminare il gruppo "${group.name}"?`)) {
        setAllGroups(prev => prev.filter(g => g.id !== groupId));
        addNotification(`Gruppo "${group.name}" eliminato.`);
      }
    }
  };

  const handleJoinGroup = (groupId: string) => {
    setAllGroups(prev => {
      const updated = prev.map(g => {
        if (g.id === groupId && !g.members.includes(currentUser.username)) {
          return { ...g, members: [...g.members, currentUser.username] };
        }
        return g;
      });
      return updated;
    });
    addNotification(`Sei entrato nel gruppo!`);
  };

  const handleAddFriend = (friendUsername: string) => {
    const target = friendUsername.toLowerCase();
    const userExists = Object.values(registeredUsers).some(u => u.username.toLowerCase() === target);
    
    if (!userExists) {
      alert(t('social_user_not_found'));
      return;
    }

    if (currentUser.friends.some(f => f.toLowerCase() === target)) {
      alert(t('social_already_friends'));
      return;
    }

    setCurrentUser(prev => ({
      ...prev,
      friends: [...prev.friends, friendUsername]
    }));
    addNotification(`@${friendUsername} aggiunto agli amici!`);
  };

  const handleInviteFriend = (groupId: string, username: string) => {
    const group = allGroups.find(g => g.id === groupId);
    if (!group) return;

    const target = username.toLowerCase();
    const invite: GroupInvitation = {
      id: Math.random().toString(36).substr(2, 9),
      groupId: group.id,
      groupName: group.name,
      invitedBy: currentUser.username,
      status: 'pending'
    };
    setAllInvites(prev => ({
      ...prev,
      [target]: [...(prev[target] || []), invite]
    }));
    addNotification(`Invito inviato a @${username}`);
  };

  const handleUpdateGroupMessages = (groupId: string, messages: any[]) => {
    setAllGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, messages };
      }
      return g;
    }));

    // Unlock badge for helping (sending messages)
    const userMessagesCount = messages.filter(m => m.senderUsername === currentUser.username).length;
    if (userMessagesCount >= 5) {
      unlockBadge('b2');
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <AnimatePresence>
        {isWelcomeScreenVisible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} flex items-center justify-center p-6`}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl transition-colors"
            >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 transform rotate-3">
                    {isLanguageStep ? <Globe size={32} /> : (isExistingUser ? <LayoutDashboard size={32} /> : <UserIcon size={32} />)}
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {isLanguageStep ? t('language_title') : (isPasswordStep && isExistingUser ? t('welcome_back') : t('welcome'))} <span className="text-indigo-600">NexoraSchool</span>
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    {isLanguageStep 
                      ? t('language_subtitle')
                      : (isPasswordStep 
                        ? (isExistingUser 
                            ? t('password_subtitle_existing').replace('{name}', welcomeName) 
                            : t('password_subtitle_new').replace('{name}', welcomeName))
                        : t('username_subtitle'))}
                  </p>
                </div>

                {isLanguageStep ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLanguageStep(false);
                          }}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                            language === lang.code 
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="font-medium">{lang.name}</span>
                          <span className="text-xl">{lang.flag}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : !isPasswordStep ? (
                  <form onSubmit={handleUsernameSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={welcomeName}
                        onChange={(e) => {
                          setWelcomeName(e.target.value);
                          setLoginError('');
                        }}
                        placeholder={t('username_placeholder')}
                        className={`w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border ${loginError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg text-center font-medium dark:text-slate-100`}
                        autoFocus
                      />
                      {loginError && <p className="text-red-500 text-xs text-center mt-2 font-medium">{loginError}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsLanguageStep(true)}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-lg transition-colors"
                      >
                        {t('language_btn')}
                      </button>
                      <button
                        type="submit"
                        disabled={!welcomeName.trim()}
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {t('continue')}
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <input
                        type="password"
                        value={welcomePassword}
                        onChange={(e) => { setWelcomePassword(e.target.value); setLoginError(''); }}
                        placeholder={t('password_placeholder')}
                        className={`w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border ${loginError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg text-center font-medium dark:text-slate-100`}
                        autoFocus
                      />
                      {loginError && <p className="text-red-500 text-xs text-center mt-2 font-medium">{loginError}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setIsPasswordStep(false); setWelcomePassword(''); setLoginError(''); }}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-lg transition-colors"
                      >
                        {t('back')}
                      </button>
                      <button
                        type="submit"
                        disabled={!welcomePassword.trim()}
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {isExistingUser ? t('login') : t('signup')}
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </form>
                )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
        {/* Sidebar */}
        <aside 
          className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-30 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
          }`}
        >
          <div className="p-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-indigo-600">
                Nexora<span className="text-slate-900">School</span>
              </h1>
              <p className="text-xs font-semibold text-slate-400 tracking-widest uppercase mt-1">Social & Learn</p>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'assistant' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <MessageSquare size={20} />
            {t('nav_assistant')}
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'social' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Users size={20} />
            {t('nav_social')}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'settings' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <LayoutDashboard size={20} />
            {t('nav_settings')}
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'faq' 
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <HelpCircle size={20} />
            {t('nav_faq')}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <img src={currentUser.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{currentUser.username}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.points} pt</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 relative transition-all duration-300 ease-in-out h-screen overflow-y-auto ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Topbar */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 transition-colors">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title={isSidebarOpen ? "Nascondi menu" : "Mostra menu"}
          >
            <Menu size={24} />
          </button>

          <div className="relative">
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        {/* Notifications Toast */}
        <div className="fixed top-20 right-8 z-50 space-y-2">
          {notifications.map((notif, idx) => (
            <div key={idx} className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-right-8 fade-in duration-300">
              {notif}
            </div>
          ))}
        </div>

          <div className="p-4 sm:p-8">
            {activeTab === 'assistant' && <NSAssistant currentUser={currentUser} language={language} />}
            {activeTab === 'social' && (
              <Social 
                currentUser={currentUser} 
                language={language}
                groups={allGroups}
                invites={allInvites[currentUser.username.toLowerCase()] || []}
                registeredUsers={Object.values(registeredUsers)}
                onCreateGroup={handleCreateGroup}
                onAcceptInvite={handleAcceptInvite}
                onDeclineInvite={handleDeclineInvite}
                onDeleteGroup={handleDeleteGroup}
                onUpdateMessages={handleUpdateGroupMessages}
                onJoinGroup={handleJoinGroup}
                onAddFriend={handleAddFriend}
                onInviteFriend={handleInviteFriend}
              />
            )}
            {activeTab === 'settings' && (
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettingsSubTab('profile')}
                    className={`pb-4 px-2 font-bold transition-all ${settingsSubTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {t('settings_profile')}
                  </button>
                  <button 
                    onClick={() => setSettingsSubTab('general')}
                    className={`pb-4 px-2 font-bold transition-all ${settingsSubTab === 'general' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {t('settings_general')}
                  </button>
                </div>

                {settingsSubTab === 'profile' ? (
                  <Profile 
                    user={currentUser} 
                    language={language}
                    onUpdateUser={handleUpdateUser} 
                    onEarnPoints={handleEarnPoints}
                  />
                ) : (
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('settings_lang')}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings_lang_subtitle')}</p>
                      </div>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('settings_dark')}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings_dark_subtitle')}</p>
                      </div>
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-14 h-8 rounded-full transition-all relative ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${isDarkMode ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => {
                          setIsWelcomeScreenVisible(true);
                          setIsPasswordStep(false);
                          setWelcomePassword('');
                        }}
                        className="flex items-center gap-2 text-red-500 font-bold hover:text-red-600 transition-colors"
                      >
                        <LogOut size={20} />
                        {t('settings_logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'faq' && <FAQ language={language} />}
          </div>
        </main>
      </div>
    </div>
  );
}
