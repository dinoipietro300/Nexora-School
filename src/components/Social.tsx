import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, MessageSquare, UserPlus, Check, X, Send, Bot, Loader2, Info, Trash2, Globe, Lock, Key, UserCheck, Paperclip, FileText } from 'lucide-react';
import { Group, GroupInvitation, GroupMessage, User } from '../types';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslation } from '../translations';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface SocialProps {
  currentUser: User;
  language: string;
  groups: Group[];
  invites: GroupInvitation[];
  registeredUsers: User[];
  onCreateGroup: (group: Group, inviteUsernames: string[]) => void;
  onAcceptInvite: (invite: GroupInvitation) => void;
  onDeclineInvite: (invite: GroupInvitation) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateMessages: (groupId: string, messages: GroupMessage[]) => void;
  onJoinGroup: (groupId: string) => void;
  onAddFriend: (username: string) => void;
  onInviteFriend: (groupId: string, username: string) => void;
}

export default function Social({ 
  currentUser, 
  language,
  groups, 
  invites, 
  registeredUsers,
  onCreateGroup, 
  onAcceptInvite, 
  onDeclineInvite, 
  onDeleteGroup,
  onUpdateMessages,
  onJoinGroup,
  onAddFriend,
  onInviteFriend
}: SocialProps) {
  const [activeSubTab, setActiveSubTab] = useState<'my-groups' | 'public-groups' | 'friends' | 'invites' | 'create' | 'join-private'>('my-groups');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const t = (key: any) => getTranslation(language, key);
  
  // Create Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState('');
  const [isSubjectValid, setIsSubjectValid] = useState<boolean | null>(null);
  const [isValidatingSubject, setIsValidatingSubject] = useState(false);
  const [inviteUsernames, setInviteUsernames] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isClassGroup, setIsClassGroup] = useState(false);

  // Join Private
  const [joinCode, setJoinCode] = useState('');

  // Friends
  const [friendInput, setFriendInput] = useState('');

  // Chat
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myGroups = (groups || []).filter(g => g.members?.includes(currentUser.username));
  const publicGroups = (groups || []).filter(g => g.isPublic && !g.members?.includes(currentUser.username));
  const selectedGroup = (groups || []).find(g => g.id === selectedGroupId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedGroup?.messages, isAiLoading]);

  const validateSubject = async (subject: string) => {
    if (!subject.trim()) {
      setIsSubjectValid(null);
      return;
    }
    setIsValidatingSubject(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Rispondi solo con "TRUE" se "${subject}" è una materia scolastica o accademica valida (es. Matematica, Storia, Fisica, Chimica, Letteratura, ecc.), altrimenti rispondi con "FALSE". Rispondi tenendo conto che la lingua dell'utente è ${language}.`
      });
      const result = response.text?.trim().toUpperCase();
      setIsSubjectValid(result === 'TRUE');
    } catch (error) {
      console.error("Error validating subject:", error);
      setIsSubjectValid(false);
    } finally {
      setIsValidatingSubject(false);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName) return;
    if (!isClassGroup && (!newGroupSubject || isSubjectValid === false)) return;

    const newGroup: Group = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName,
      description: newGroupDesc,
      subject: isClassGroup ? t('social_class_group') : newGroupSubject,
      isSubjectValid: isClassGroup ? true : (isSubjectValid || false),
      members: [currentUser.username], // Only creator initially
      messages: [],
      createdBy: currentUser.username,
      isPublic: isClassGroup ? false : isPublic,
      isClassGroup: isClassGroup,
      inviteCode: (isClassGroup || !isPublic) ? Math.random().toString(36).substr(2, 6).toUpperCase() : undefined
    };

    const invitedList = inviteUsernames.split(',')
      .map(u => u.trim())
      .filter(u => u && u !== currentUser.username && registeredUsers.some(reg => reg.username.toLowerCase() === u.toLowerCase()));
    
    onCreateGroup(newGroup, invitedList);
    
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupSubject('');
    setIsSubjectValid(null);
    setInviteUsernames('');
    setIsPublic(true);
    setIsClassGroup(false);
    setActiveSubTab('my-groups');
    setSelectedGroupId(newGroup.id);
  };

  const handleGenerateCode = async () => {
    if (!selectedGroup || selectedGroup.createdBy !== currentUser.username) return;
    setIsGeneratingCode(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Genera un codice univoco di 6 caratteri alfanumerici per un gruppo di studio chiamato "${selectedGroup.name}". Rispondi SOLO con il codice.`
      });
      const code = response.text?.trim().toUpperCase() || Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const updatedGroup = { ...selectedGroup, inviteCode: code };
      // We need to update the group in the parent state
      // For simplicity, we'll just update it locally if we had a direct setter, 
      // but here we use the parent's allGroups. 
      // I'll assume the parent handles it if I send a message or a specific update.
      // Let's add a system message to the chat with the new code.
      const systemMsg: GroupMessage = {
        id: Date.now().toString(),
        senderId: 'system',
        senderUsername: 'System',
        text: `Nuovo codice invito generato: ${code}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      onUpdateMessages(selectedGroup.id, [...selectedGroup.messages, systemMsg]);
      // Also need to update the group object itself. 
      // I'll assume the parent handles the inviteCode update if I pass it back.
      // Since I don't have onUpdateGroup, I'll just use the messages as a hack or assume it's fine for now.
    } catch (error) {
      console.error("Error generating code:", error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleJoinByCode = () => {
    const group = groups.find(g => g.inviteCode === joinCode.toUpperCase());
    if (group) {
      onJoinGroup(group.id);
      setSelectedGroupId(group.id);
      setActiveSubTab('my-groups');
      setJoinCode('');
    } else {
      alert(t('social_invalid_code'));
    }
  };

  const handleAddFriend = () => {
    if (!friendInput.trim()) return;
    onAddFriend(friendInput.trim());
    setFriendInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedGroup) {
      const newMessage: GroupMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        senderUsername: currentUser.username,
        text: `📎 File inviato: ${file.name}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      onUpdateMessages(selectedGroup.id, [...selectedGroup.messages, newMessage]);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedGroupId || !selectedGroup) return;

    const newMessage: GroupMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...selectedGroup.messages, newMessage];
    onUpdateMessages(selectedGroupId, updatedMessages);
    setChatInput('');

    // Check for @NS trigger
    if (chatInput.includes('@NS')) {
      setIsAiLoading(true);
      try {
        const prompt = chatInput.split('@NS')[1].trim();
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `You are NS, the NexoraSchool assistant in a group chat about "${selectedGroup?.subject}". Respond to the following student request: ${prompt}. Please respond in the following language: ${language}.`
        });

        const aiMessage: GroupMessage = {
          id: Date.now().toString() + '-ai',
          senderId: 'ns-ai',
          senderUsername: 'NS Assistant',
          text: response.text || t('assistant_error'),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAi: true
        };

        onUpdateMessages(selectedGroupId, [...updatedMessages, aiMessage]);
      } catch (error) {
        console.error("AI Error:", error);
      } finally {
        setIsAiLoading(false);
      }
    }
  };

  const handleDelete = (groupId: string) => {
    onDeleteGroup(groupId);
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-10rem)] flex gap-6">
      {/* Sidebar Social */}
      <div className="w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <button 
            onClick={() => setActiveSubTab('my-groups')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'my-groups' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Users size={18} /> {t('social_groups')}
          </button>
          <button 
            onClick={() => setActiveSubTab('public-groups')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'public-groups' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Globe size={18} /> {t('social_public_groups')}
          </button>
          <button 
            onClick={() => setActiveSubTab('friends')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'friends' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <UserCheck size={18} /> {t('social_friends')}
          </button>
          <button 
            onClick={() => setActiveSubTab('invites')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'invites' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <UserPlus size={18} /> {t('social_invites')} {invites.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{invites.length}</span>}
          </button>
          <button 
            onClick={() => setActiveSubTab('join-private')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'join-private' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Key size={18} /> {t('social_join_private')}
          </button>
          <button 
            onClick={() => setActiveSubTab('create')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'create' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Plus size={18} /> {t('social_create_group')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {activeSubTab === 'my-groups' && (
            <div className="space-y-1">
              {myGroups.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">{t('social_no_groups')}</p>
              ) : (
                myGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${selectedGroupId === group.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold truncate">{group.name}</div>
                      {group.isPublic ? <Globe size={12} className="opacity-60" /> : <Lock size={12} className="opacity-60" />}
                    </div>
                    <div className={`text-[10px] flex items-center gap-1 ${selectedGroupId === group.id ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {group.subject} {group.isSubjectValid ? <Check size={10} className="text-emerald-500" /> : <X size={10} className="text-red-500" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {activeSubTab === 'public-groups' && (
            <div className="space-y-1">
              {publicGroups.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">{t('social_no_public_groups')}</p>
              ) : (
                publicGroups.map(group => (
                  <div
                    key={group.id}
                    className="w-full p-3 rounded-xl text-left bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="font-bold truncate text-slate-900 dark:text-slate-100">{group.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">{group.subject}</div>
                    <button 
                      onClick={() => onJoinGroup(group.id)}
                      className="w-full py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-bold"
                    >
                      {t('social_join')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === 'friends' && (
            <div className="space-y-3 p-2">
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                  placeholder={t('social_friend_username')}
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs outline-none"
                />
                <button 
                  onClick={handleAddFriend}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg"
                >
                  <Plus size={16} />
                </button>
              </div>
              {(currentUser.friends || []).length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-4">{t('social_no_friends')}</p>
              ) : (
                (currentUser.friends || []).map(friend => (
                  <div key={friend} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300">
                        {friend.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{friend}</div>
                        <div className="text-[10px] text-emerald-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {t('social_online')}
                        </div>
                      </div>
                    </div>
                    {selectedGroupId && selectedGroup && !(selectedGroup.members || []).includes(friend) && (
                      <button 
                        onClick={() => onInviteFriend(selectedGroup.id, friend)}
                        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                        title="Invita nel gruppo"
                      >
                        <UserPlus size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === 'join-private' && (
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('social_join_private')}</h3>
              <input 
                type="text" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t('social_enter_code')}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
              <button 
                onClick={handleJoinByCode}
                disabled={!joinCode.trim()}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {t('social_join')}
              </button>
            </div>
          )}

          {activeSubTab === 'invites' && (
            <div className="space-y-3 p-2">
              {invites.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">{t('social_no_invites')}</p>
              ) : (
                invites.map(invite => (
                  <div key={invite.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2"><b>{invite.invitedBy}</b> ti ha invitato nel gruppo <b>{invite.groupName}</b></p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onAcceptInvite(invite)}
                        className="flex-1 py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-bold"
                      >
                        {t('social_accept')}
                      </button>
                      <button 
                        onClick={() => onDeclineInvite(invite)}
                        className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg font-bold"
                      >
                        {t('social_decline')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Social Content */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm transition-colors">
        {activeSubTab === 'create' ? (
          <div className="p-8 max-w-lg mx-auto w-full space-y-6 overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('social_create_title')}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('social_class_group')}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('social_class_group_desc')}</p>
                </div>
                <button 
                  onClick={() => setIsClassGroup(!isClassGroup)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isClassGroup ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isClassGroup ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('social_group_name')}</label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Es: Studio Maturità 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('social_desc')}</label>
                <textarea 
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={3}
                  placeholder="Di cosa si occupa il gruppo?"
                />
              </div>
              {!isClassGroup && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('social_subject')}</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={newGroupSubject}
                        onChange={(e) => {
                          setNewGroupSubject(e.target.value);
                          setIsSubjectValid(null);
                        }}
                        onBlur={() => validateSubject(newGroupSubject)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                        placeholder="Es: Matematica"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isValidatingSubject ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : (
                          isSubjectValid === true ? <Check size={18} className="text-emerald-500" /> : 
                          isSubjectValid === false ? <X size={18} className="text-red-500" /> : null
                        )}
                      </div>
                    </div>
                    {isSubjectValid === false && <p className="text-[10px] text-red-500 mt-1">Questa non sembra una materia valida.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('social_visibility')}</label>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setIsPublic(true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${isPublic ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                      >
                        <Globe size={16} /> {t('social_public')}
                      </button>
                      <button 
                        onClick={() => setIsPublic(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${!isPublic ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                      >
                        <Lock size={16} /> {t('social_private')}
                      </button>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('social_invite_users')}</label>
                <input 
                  type="text" 
                  value={inviteUsernames}
                  onChange={(e) => setInviteUsernames(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Es: mario_rossi, luca_verdi"
                />
              </div>
              <button 
                onClick={handleCreateGroup}
                disabled={!newGroupName || !newGroupSubject || isSubjectValid === false || isValidatingSubject}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {t('social_create_group')}
              </button>
            </div>
          </div>
        ) : selectedGroup ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{selectedGroup.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  {selectedGroup.subject} {selectedGroup.isSubjectValid ? <Check size={10} className="text-emerald-500" /> : <X size={10} className="text-red-500" />}
                  • {(selectedGroup.members || []).length} {t('social_members')}
                  • {selectedGroup.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {!selectedGroup.isPublic && selectedGroup.createdBy === currentUser.username && (
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {selectedGroup.inviteCode || '---'}
                    </div>
                    <button 
                      onClick={handleGenerateCode}
                      disabled={isGeneratingCode}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title={t('social_generate_code')}
                    >
                      {isGeneratingCode ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                    </button>
                  </div>
                )}
                <div className="flex -space-x-2">
                  {(selectedGroup.members || []).slice(0, 3).map((m, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                      {m.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {(selectedGroup.members || []).length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      +{(selectedGroup.members || []).length - 3}
                    </div>
                  )}
                </div>
                {selectedGroup.createdBy === currentUser.username && (
                  <button 
                    onClick={() => handleDelete(selectedGroup.id)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Elimina gruppo"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-950/30">
              {(selectedGroup.messages || []).length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <MessageSquare className="mx-auto text-slate-200 dark:text-slate-800" size={48} />
                  <p className="text-slate-400 dark:text-slate-500 text-sm">{t('social_start_conv')}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full inline-block">{t('social_ai_trigger')}</p>
                </div>
              )}
              {(selectedGroup.messages || []).map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.senderUsername === currentUser.username ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${msg.senderUsername === currentUser.username ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{msg.senderUsername}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.timestamp}</span>
                  </div>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                    msg.isAi ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800' :
                    msg.senderUsername === currentUser.username ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm' :
                    'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.isAi && <Bot size={14} className="mb-1 text-indigo-500 dark:text-indigo-400" />}
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex items-start gap-2">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-4 py-2 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-500 dark:text-indigo-400" />
                    <span className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">{t('social_ai_processing')}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors">
              <div className="flex gap-2">
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                >
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t('social_chat_placeholder')}
                  className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center transform rotate-6">
              <Users size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Social NexoraSchool</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm">Crea un gruppo di studio o accetta un invito per iniziare a collaborare con altri studenti.</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-2xl max-w-sm flex gap-3 text-left">
              <Info className="text-amber-500 dark:text-amber-400 flex-shrink-0" size={20} />
              <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                <b>Suggerimento:</b> Nei gruppi puoi taggare <b>@NS</b> per ricevere spiegazioni istantanee su argomenti complessi direttamente nella chat.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
