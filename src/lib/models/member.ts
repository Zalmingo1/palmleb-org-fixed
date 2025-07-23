export interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
  lodge?: string;
}

// In-memory storage for members (replace with database in production)
let members: Member[] = [];

export const Member = {
  findById: async (id: string): Promise<Member | null> => {
    return members.find(member => member.id === id) || null;
  },

  create: async (member: Omit<Member, 'id'>): Promise<Member> => {
    const newMember = {
      ...member,
      id: Date.now().toString()
    };
    members.push(newMember);
    return newMember;
  },

  update: async (id: string, updates: Partial<Member>): Promise<Member | null> => {
    const index = members.findIndex(member => member.id === id);
    if (index === -1) return null;
    
    members[index] = {
      ...members[index],
      ...updates
    };
    
    return members[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const initialLength = members.length;
    members = members.filter(member => member.id !== id);
    return members.length < initialLength;
  },

  findAll: async (): Promise<Member[]> => {
    return members;
  }
}; 