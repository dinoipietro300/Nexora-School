import { Badge, FAQItem, User } from '../types';

export const AVAILABLE_SUBJECTS = [
  'Matematica',
  'Fisica',
  'Chimica',
  'Biologia',
  'Informatica',
  'Storia',
  'Filosofia',
  'Letteratura',
  'Lingue Straniere',
  'Arte'
];

export const ALL_BADGES: Badge[] = [
  {
    id: 'b1',
    name: 'Primo Passo',
    description: 'Hai completato il tuo profilo.',
    icon: 'UserCheck'
  },
  {
    id: 'b2',
    name: 'Aiutante Novizio',
    description: 'Hai aiutato 5 studenti.',
    icon: 'HandHeart'
  },
  {
    id: 'b3',
    name: 'Risolutore',
    description: 'Hai risolto un compito complesso.',
    icon: 'Lightbulb'
  },
  {
    id: 'b4',
    name: 'Pilastro della Community',
    description: 'Hai raggiunto 500 punti.',
    icon: 'Award'
  },
  {
    id: 'b5',
    name: 'Socializzatore',
    description: 'Ti sei unito a 3 gruppi di studio.',
    icon: 'Users'
  }
];

export const INITIAL_USER: User = {
  id: 'u1',
  username: 'studente_curioso',
  password: 'password123',
  avatarUrl: 'https://picsum.photos/seed/nexora/200/200',
  bio: 'Appassionato di scienze e tecnologia. Sempre pronto ad imparare cose nuove!',
  subjects: ['Matematica', 'Informatica'],
  points: 120,
  badges: [
    { ...ALL_BADGES[0], unlockedAt: new Date().toISOString() },
    { ...ALL_BADGES[1], unlockedAt: new Date().toISOString() }
  ],
  friends: []
};

export const EXISTING_USERNAMES = ['admin', 'nexora', 'mario_rossi', 'studente_curioso'];

export const FAQS: FAQItem[] = [
  {
    id: 'f1',
    category: 'Assistenza Compiti',
    question: 'Come posso chiedere aiuto per un compito?',
    answer: 'Puoi pubblicare una richiesta nella sezione "Aiuto Compiti" specificando la materia e allegando eventuali foto o documenti. I tutor o gli altri studenti ti risponderanno al più presto.'
  },
  {
    id: 'f2',
    category: 'Chiamate Live',
    question: 'Come funzionano le chiamate live?',
    answer: 'Le chiamate live ti permettono di studiare in tempo reale con altri studenti o tutor. Puoi avviare una chiamata direttamente da un gruppo di studio o prenotare una sessione con un tutor certificato.'
  },
  {
    id: 'f3',
    category: 'Condivisione Immagini',
    question: 'Posso inviare foto dei miei appunti o esercizi?',
    answer: 'Certamente! Puoi caricare immagini nei post di richiesta aiuto, nelle chat di gruppo o durante le chiamate live per condividere facilmente i tuoi appunti o i passaggi di un esercizio.'
  },
  {
    id: 'f4',
    category: 'Social & Gruppi',
    question: 'Come posso creare o unirmi a un gruppo di studio?',
    answer: 'Nella sezione Social, clicca su "Esplora Gruppi" per cercare gruppi esistenti per materia o interesse. Se non trovi quello che cerchi, puoi cliccare su "Crea Gruppo" e invitare altri studenti.'
  },
  {
    id: 'f5',
    category: 'Social & Gruppi',
    question: 'Chi modera i contenuti su NexoraSchool (NS)?',
    answer: 'La moderazione è gestita dal nostro team (NS Moderation) e da moderatori volontari scelti tra gli studenti più attivi e affidabili. Ci assicuriamo che l\'ambiente rimanga sempre rispettoso e focalizzato sull\'apprendimento.'
  },
  {
    id: 'f6',
    category: 'Gamification',
    question: 'Come guadagno punti e sblocco badge?',
    answer: 'Guadagni punti rispondendo alle domande degli altri, partecipando attivamente ai gruppi e completando il tuo profilo. Raggiungendo determinati traguardi sbloccherai badge speciali visibili sul tuo profilo!'
  }
];
