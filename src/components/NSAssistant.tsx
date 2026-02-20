import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Phone, X, Bot, User, Loader2, Copy, Check, Trash2, MessageSquare, Plus } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { getTranslation } from '../translations';
import { User as UserType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
type Message = { role: 'user' | 'model'; parts: Part[] };
type ChatSession = { id: string; title: string; messages: Message[]; timestamp: number };

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
    return [{ role: 'model', parts: [{ text: t('assistant_initial') }] }];
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'model') {
      setMessages([{ role: 'model', parts: [{ text: t('assistant_initial') }] }]);
    }
  }, [language]);

  const handleNewChat = () => {
    setMessages([{ role: 'model', parts: [{ text: t('assistant_initial') }] }]);
    setShowHistory(false);
  };

  const handleClearChat = () => {
    if (window.confirm(t('assistant_clear_confirm'))) {
      setMessages([{ role: 'model', parts: [{ text: t('assistant_initial') }] }]);
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
      reader.onloadend = () => setSelectedImage(reader.result as string);
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
      const genModel = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const contents = updatedMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: msg.parts
      }));

      const result = await genModel.generateContent({
        contents,
        systemInstruction: "Sei NS, un assistente scolastico gentile. Rispondi in modo chiaro e incoraggiante."
      });

      const responseText = result.response.text();
      setMessages([...updatedMessages, { role: 'model', parts: [{ text: responseText }] }]);
    } catch (error) {
      setMessages([...updatedMessages, { role: 'model', parts: [{ text: "Errore di connessione." }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative max-w-5xl mx-auto transition-colors">
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
          <button onClick={() => setShowHistory(!showHistory)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl"><MessageSquare size={20} /></button>
          <button onClick={handleNewChat} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl"><Plus size={20} /></button>
          <button onClick={handleClearChat} className="p-2 text-slate-400 hover:text-red-600 rounded-xl"><Trash2 size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}>
              {msg.parts.map((part, pIdx) => (
                <div key={pIdx}>
                  {part.text && <ReactMarkdown className="prose dark:prose-invert max-w-none">{part.text}</ReactMarkdown>}
                  {part.inlineData && <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="Upload" className="rounded-lg mt-2 max-h-60" />}
                </div>
              ))}
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><Loader2 className="animate-spin text-indigo-600" /></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-indigo-600"><ImageIcon size={24} /></button>
          <input 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('assistant_placeholder')}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button onClick={handleSend} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"><Send size={24} /></button>
        </div>
      </div>
    </div>
  );
}
