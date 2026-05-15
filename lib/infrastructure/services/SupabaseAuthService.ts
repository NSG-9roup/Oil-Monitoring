import { createClient } from '@/lib/supabase/server'
import { IAuthService } from '@/lib/domain/services/IAuthService'
import { Profile } from '@/lib/domain/entities/auth'

export class SupabaseAuthService implements IAuthService {
  async getCurrentUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return { id: user.id, email: user.email! }
  }

  async getUserProfile(id: string): Promise<Profile | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('oil_profiles')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return null
    return data
  }

  async verifyRole(role: string): Promise<boolean> {
    const user = await this.getCurrentUser()
    if (!user) return false
    const profile = await this.getUserProfile(user.id)
    return profile?.role === role
  }
}
