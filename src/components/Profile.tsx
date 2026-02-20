import React, { useState, useRef } from 'react';
import { User, Badge } from '../types';
import { AVAILABLE_SUBJECTS, EXISTING_USERNAMES, ALL_BADGES } from '../data/mockData';
import { Camera, Edit2, Save, X, AlertCircle, Award, Star, HandHeart, Lightbulb, Users, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { getTranslation } from '../translations';

interface ProfileProps {
  user: User;
  language: string;
  onUpdateUser: (user: User) => void;
  onEarnPoints: (points: number, reason: string) => void;
}

const IconMap: Record<string, React.ElementType> = {
  UserCheck,
  HandHeart,
  Lightbulb,
  Award,
  Users
};

const COLOR_OPTIONS = [
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
  { name: 'Emerald', value: 'emerald', class: 'bg-emerald-500' },
  { name: 'Rose', value: 'rose', class: 'bg-rose-500' },
  { name: 'Amber', value: 'amber', class: 'bg-amber-500' },
  { name: 'Violet', value: 'violet', class: 'bg-violet-500' },
  { name: 'Slate', value: 'slate', class: 'bg-slate-500' },
];

export default function Profile({ user, language, onUpdateUser, onEarnPoints }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<User>(user);
  const [usernameError, setUsernameError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = (key: any) => getTranslation(language, key);

  const handleSave = () => {
    if (editForm.username !== user.username && EXISTING_USERNAMES.includes(editForm.username.toLowerCase())) {
      setUsernameError('Questo nome utente è già in uso.');
      return;
    }
    if (editForm.username.trim().length < 3) {
      setUsernameError('Il nome utente deve avere almeno 3 caratteri.');
      return;
    }
    
    setUsernameError('');
    onUpdateUser(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(user);
    setUsernameError('');
    setIsEditing(false);
  };

  const toggleSubject = (subject: string) => {
    setEditForm(prev => {
      const subjects = prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject];
      return { ...prev, subjects };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateLevel = (points: number) => {
    return Math.floor(points / 100) + 1;
  };

  const level = calculateLevel(user.points);
  const nextLevelPoints = level * 100;
  const progress = ((user.points % 100) / 100) * 100;

  const themeColor = user.themeColor || 'indigo';
  const gradientClass = {
    indigo: 'from-indigo-500 to-violet-600',
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-600',
    slate: 'from-slate-500 to-slate-700',
  }[themeColor as keyof typeof gradientClass] || 'from-indigo-500 to-violet-600';

  const accentColorClass = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white',
    violet: 'bg-violet-600 hover:bg-violet-700 text-white',
    slate: 'bg-slate-600 hover:bg-slate-700 text-white',
  }[themeColor as keyof typeof accentColorClass] || 'bg-indigo-600 hover:bg-indigo-700 text-white';

  const lightAccentClass = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  }[themeColor as keyof typeof lightAccentClass] || 'bg-indigo-50 text-indigo-700';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header / Basic Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className={`h-32 bg-gradient-to-r ${gradientClass}`}></div>
        <div className="px-8 pb-8 relative">
          <div className="flex justify-between items-end -mt-12 mb-6">
            <div className="relative group">
              <img 
                src={isEditing ? editForm.avatarUrl : user.avatarUrl} 
                alt="Profile" 
                className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 object-cover bg-white dark:bg-slate-800 shadow-md"
              />
              {isEditing && (
                <>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button 
                    className={`absolute bottom-0 right-0 p-1.5 ${accentColorClass} rounded-full transition-colors`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={16} />
                  </button>
                </>
              )}
            </div>
            
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
              >
                <Edit2 size={16} />
                {t('profile_edit')}
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                >
                  <X size={16} />
                  {t('profile_cancel')}
                </button>
                <button 
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-4 py-2 ${accentColorClass} rounded-xl font-medium transition-colors`}
                >
                  <Save size={16} />
                  {t('profile_save')}
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('profile_username')}</label>
                  <input 
                    type="text" 
                    value={editForm.username}
                    onChange={(e) => {
                      setEditForm({ ...editForm, username: e.target.value });
                      setUsernameError('');
                    }}
                    className={`w-full px-4 py-2 rounded-xl border ${usernameError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'} bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                  {usernameError && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle size={14} /> {usernameError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile_theme')}</label>
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setEditForm({ ...editForm, themeColor: color.value })}
                        className={`w-8 h-8 rounded-full ${color.class} border-2 transition-all ${
                          editForm.themeColor === color.value ? 'border-slate-900 dark:border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('profile_bio')}</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder={t('profile_bio_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('profile_subjects')}</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SUBJECTS.map(subject => (
                    <button
                      key={subject}
                      onClick={() => toggleSubject(subject)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        editForm.subjects.includes(subject)
                          ? `${lightAccentClass} border border-transparent`
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">@{user.username}</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">{user.bio || t('profile_no_bio')}</p>
              </div>
              
              {user.subjects.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">{t('profile_subjects')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.subjects.map(subject => (
                      <span key={subject} className={`px-3 py-1 ${lightAccentClass} rounded-lg text-sm font-medium`}>
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gamification Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Level & Points */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 md:col-span-1 flex flex-col justify-center items-center text-center">
          <div className={`w-20 h-20 ${lightAccentClass.split(' ')[0]} rounded-full flex items-center justify-center mb-4 relative`}>
            <Star className={`${lightAccentClass.split(' ')[1]} w-10 h-10`} fill="currentColor" />
            <div className={`absolute -bottom-2 ${accentColorClass.split(' ')[0]} text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-900`}>
              LVL {level}
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user.points} {t('profile_points')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Studente Attivo</p>
          
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Progresso</span>
              <span>{user.points} / {nextLevelPoints}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`${accentColorClass.split(' ')[0]} h-2.5 rounded-full`}
              />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className={`${lightAccentClass.split(' ')[1]}`} />
              {t('profile_badges')}
            </h2>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {user.badges.length} / {ALL_BADGES.length} {t('profile_unlocked')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_BADGES.map(badge => {
              const isUnlocked = user.badges.some(b => b.id === badge.id);
              const Icon = IconMap[badge.icon] || Award;
              
              return (
                <div 
                  key={badge.id} 
                  className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${
                    isUnlocked 
                      ? `bg-white dark:bg-slate-800 border-${themeColor}-100 dark:border-slate-700 shadow-sm` 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60 grayscale'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${isUnlocked ? lightAccentClass : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${isUnlocked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                      {badge.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {badge.description}
                    </p>
                    {isUnlocked && (
                      <span className={`text-[10px] font-medium ${lightAccentClass.split(' ')[1]} uppercase tracking-wider mt-2 block`}>
                        {t('profile_unlocked')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
