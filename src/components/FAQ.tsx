import React, { useState } from 'react';
import { FAQS } from '../data/mockData';
import { ChevronDown, MessageCircleQuestion, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslation } from '../translations';

interface FAQProps {
  language: string;
}

export default function FAQ({ language }: FAQProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const t = (key: any) => getTranslation(language, key);

  const categories = Array.from(new Set(FAQS.map(faq => faq.category)));

  const filteredFaqs = FAQS.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4 mb-12">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
          <MessageCircleQuestion size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t('faq_title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          {t('faq_subtitle')}
        </p>

        <div className="relative max-w-xl mx-auto mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
          <input 
            type="text"
            placeholder={t('faq_search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="space-y-8">
        {categories.map(category => {
          const categoryFaqs = filteredFaqs.filter(faq => faq.category === category);
          
          if (categoryFaqs.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-8 h-px bg-slate-200 dark:bg-slate-800"></span>
                {category}
                <span className="w-full h-px bg-slate-200 dark:bg-slate-800 flex-1"></span>
              </h2>
              
              <div className="space-y-3">
                {categoryFaqs.map(faq => {
                  const isOpen = openId === faq.id;
                  
                  return (
                    <div 
                      key={faq.id}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
                        isOpen ? 'border-indigo-200 dark:border-indigo-800 shadow-md' : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-100 dark:hover:border-indigo-900'
                      }`}
                    >
                      <button
                        onClick={() => setOpenId(isOpen ? null : faq.id)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                      >
                        <span className={`font-medium pr-8 ${isOpen ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {faq.question}
                        </span>
                        <ChevronDown 
                          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''}`} 
                          size={20} 
                        />
                      </button>
                      
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-6 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-50 dark:border-slate-800 pt-4">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">{t('faq_no_results')} "{searchQuery}".</p>
          </div>
        )}
      </div>
    </div>
  );
}
