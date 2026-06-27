import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      canViewAllTasks?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    can_view_all_tasks?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    canViewAllTasks?: boolean;
  }
}
