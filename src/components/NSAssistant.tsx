import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Phone, X, Bot, User, Loader2, Copy, Check, Trash2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { getTranslation } from '../translations';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
type Message = { role: 'user' | 'model'; parts: Part[] };
type ChatSession = { id: string; title: string; messages: Message[]; timestamp: number };

import { User as UserType } from '../types';

interface NSAssistantProps {
  currentUser: UserType;
  language: string;
}

export default function NSAssistant({ currentUser, language }: NSAssistantProps) {
  const storageKey = `ns_chat_history_${currentUser.username.toLowerCase()}`;
  const sessionsKey = `ns_chat_sessions_${currentUser.username.toLowerCase()}`;
  const t = (key: any) => getTranslation(language, key);

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(sessionsKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [
      {
        role: 'model',
        parts: [{ text: t('assistant_initial') }]
      }
    ];
  });
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem(storageKey, JSON.stringify(messages));
    localStorage.setItem(sessionsKey, JSON.stringify(sessions));
  }, [messages, sessions, isLoading, storageKey, sessionsKey]);

  // Update initial message when language changes if it's the only message
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'model') {
      setMessages([{ role: 'model', parts: [{ text: t('assistant_initial') }] }]);
    }
  }, [language]);

  const handleNewChat = async () => {
    if (messages.length > 1) {
      // Save current chat
      try {
        const firstUserMsg = messages.find(m => m.role === 'user')?.parts[0]?.text || 'Nuova Chat';
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Genera un titolo brevissimo (max 3-4 parole) per questa conversazione che inizia con: "${firstUserMsg}". Rispondi SOLO con il titolo.`
        });
        const title = response.text?.trim() || firstUserMsg.substring(0, 20);
        
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title,
          messages,
          timestamp: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
      } catch (error) {
        console.error("Error saving session:", error);
      }
    }

    // Reset current chat
    setMessages([
      {
        role: 'model',
        parts: [{ text: t('assistant_initial') }]
      }
    ]);
  };

  const handleLoadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setShowHistory(false);
  };

  const handleClearChat = () => {
    if (window.confirm(t('assistant_clear_confirm'))) {
      const initial: Message[] = [
        {
          role: 'model',
          parts: [{ text: t('assistant_initial') }]
        }
      ];
      setMessages(initial);
      localStorage.removeItem(storageKey);
    }
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const newParts: Part[] = [];
    if (selectedImage) {
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];
      newParts.push({ inlineData: { data: base64Data, mimeType } });
    }
    if (inputText.trim()) {
      newParts.push({ text: inputText.trim() });
    }

    const newUserMsg: Message = { role: 'user', parts: newParts };
    const updatedMessages = [...messages, newUserMsg];
    
    setMessages(updatedMessages);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Format history for Gemini
      const contents = updatedMessages.map(msg => ({
        role: msg.role,
        parts: msg.parts
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: `You are NS (short for NexoraSchool), a friendly, cordial, and kind AI. You help students with their homework, explaining solutions clearly and in detail. Always be encouraging and use a positive tone. Please respond in the same language as the user's last message.`
        }
      });

      if (response.text) {
        setMessages([...updatedMessages, { role: 'model', parts: [{ text: response.text }] }]);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      setMessages([...updatedMessages, { role: 'model', parts: [{ text: "Scusa, ho riscontrato un errore. Riprova più tardi." }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative max-w-5xl mx-auto transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">{t('assistant_title')}</h2>
            <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {t('assistant_online')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
            title={t('assistant_history')}
          >
            <MessageSquare size={20} />
          </button>
          <button 
            onClick={handleNewChat}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
            title={t('assistant_new_chat')}
          >
            <Plus size={20} />
          </button>
          <button 
            onClick={handleClearChat}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            title="Cancella cronologia"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={() => setIsCalling(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl font-medium transition-colors"
          >
            <Phone size={18} />
            <span className="hidden sm:inline">{t('assistant_live_call')}</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20 shadow-xl overflow-y-auto custom-scrollbar"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('assistant_history')}</h3>
                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>
              <div className="p-2 space-y-1">
                {sessions.length === 0 ? (
                  <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">{t('assistant_no_history')}</p>
                ) : (
                  sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => handleLoadSession(session)}
                      className="w-full p-3 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {session.title}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 relative group ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
              }`}>
                {msg.role === 'model' && (
                  <button
                    onClick={() => handleCopy(msg.parts.map(p => p.text).join('\n'), idx)}
                    className="absolute -right-10 top-0 p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Copia risposta"
                  >
                    {copiedId === idx ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                )}
                {msg.parts.map((part, pIdx) => (
                  <div key={pIdx}>
                    {part.inlineData && (
                      <img 
                        src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                        alt="Uploaded" 
                        className="max-w-full rounded-xl mb-3 max-h-64 object-contain bg-white/10"
                      />
                    )}
                    {part.text && (
                      <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                        <ReactMarkdown>{part.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-indigo-500 dark:text-indigo-400" />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('assistant_writing')}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-slate-200 dark:border-slate-700 object-cover" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors flex-shrink-0"
            title="Allega un'immagine"
          >
            <ImageIcon size={24} />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('assistant_placeholder')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none min-h-[52px] max-h-32"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Call Modal */}
      {isCalling && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-2 bg-indigo-500 rounded-full animate-pulse opacity-40"></div>
              <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center relative z-10 border-4 border-white dark:border-slate-800 shadow-lg">
                <Bot size={48} className="text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">NS Assistant</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 animate-pulse">Connessione in corso...</p>
            
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setIsCalling(false)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-red-500/20"
              >
                <Phone size={20} className="rotate-[135deg]" />
                Termina
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-center">
              *La funzionalità di chiamata vocale live è in fase di sviluppo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
