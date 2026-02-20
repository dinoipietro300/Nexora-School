export interface User {
  id: string;
  username: string;
  password?: string;
  email?: string; // Added email
  avatarUrl: string;
  bio: string;
  subjects: string[];
  points: number;
  badges: Badge[];
  themeColor?: string;
  friends: string[]; // Usernames
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  text: string;
  timestamp: string;
  isAi?: boolean;
  type?: 'text' | 'file'; // Added type
  fileUrl?: string; // Added fileUrl
  fileName?: string; // Added fileName
  fileType?: string; // Added fileType
  isEdited?: boolean; // Added isEdited
}

export interface Group {
  id: string;
  name: string;
  description: string;
  subject: string;
  isSubjectValid: boolean;
  members: string[]; // Usernames
  admins: string[]; // Added admins
  messages: GroupMessage[];
  createdBy: string;
  isPublic: boolean;
  inviteCode?: string;
  imageUrl?: string; // Added group image
}

export interface AIChat {
  id: string;
  title: string;
  messages: GroupMessage[];
  timestamp: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
}
