import { Profile } from '../entities/auth'

export interface IAuthService {
  getCurrentUser(): Promise<{ id: string; email: string } | null>
  getUserProfile(id: string): Promise<Profile | null>
  verifyRole(role: string): Promise<boolean>
}
