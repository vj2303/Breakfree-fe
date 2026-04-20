// types.ts
export interface AIProfile {
    id: string;
    title: string;
    systemInstruction: string;
    temperature: number;
    model: 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'gemini-pro';
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
  }

  export interface AIProfilesResponse {
    aiProfiles: AIProfile[];
    pagination: PaginationInfo;
  }
  
  export interface CreateProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: Omit<AIProfile, 'id'>) => void;
    editingProfile?: AIProfile;
  }
  
  export interface AIProfileCardProps {
    profile: AIProfile;
    onEdit: (profile: AIProfile) => void;
    onDelete: (id: string) => void;
  }