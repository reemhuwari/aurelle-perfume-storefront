export interface User { id: number; name: string; email: string; password: string; createdAt: string }
export type SessionUser = Omit<User, 'password'>;
export interface Favorite { id: number; userId: number; perfumeId: number }
