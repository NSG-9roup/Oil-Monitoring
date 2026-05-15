/**
 * Database Connection Pool Configuration
 * 
 * Optimizes Supabase connection pooling for better performance
 * and reduced latency when handling concurrent requests.
 */

import { createClient } from '@/lib/supabase/server'

interface PoolConfig {
  min: number // Minimum connections to keep alive
  max: number // Maximum connections allowed
  idleTimeout: number // Seconds before idle connection closes
  acquireTimeout: number // Milliseconds to wait for connection
}

/**
 * Recommended pool configuration for different scenarios
 */
export const POOL_CONFIGS = {
  // Production: High concurrency dashboard with 100+ concurrent users
  production: {
    min: 10,
    max: 25,
    idleTimeout: 30,
    acquireTimeout: 5000,
  },

  // Staging: Medium load, ~50 concurrent users
  staging: {
    min: 5,
    max: 15,
    idleTimeout: 30,
    acquireTimeout: 5000,
  },

  // Development: Low load, single developer
  development: {
    min: 2,
    max: 5,
    idleTimeout: 60,
    acquireTimeout: 10000,
  },
} as const

/**
 * Get pool configuration based on environment
 */
export function getPoolConfig(): PoolConfig {
  const env = process.env.NODE_ENV || 'development'
  
  if (env === 'production') {
    return POOL_CONFIGS.production
  }
  
  return POOL_CONFIGS.development
}

/**
 * Supabase connection optimization tips:
 * 
 * 1. **Use Connection Pooling**:
 *    - Enable PgBouncer in Supabase dashboard
 *    - Use pooling mode: "Transaction" for serverless functions
 *    - Use pooling mode: "Session" for persistent connections
 * 
 * 2. **Optimize Queries**:
 *    - Add indexes to frequently filtered columns
 *    - Use pagination (limit/offset) for large result sets
 *    - Avoid N+1 queries with proper joins
 *    - Batch multiple operations when possible
 * 
 * 3. **Connection Reuse**:
 *    - Create single Supabase client instance
 *    - Reuse client across requests
 *    - Avoid creating new client per request
 * 
 * 4. **RLS Policy Optimization**:
 *    - Index the columns used in RLS conditions
 *    - Keep policies simple when possible
 *    - Avoid calling functions in RLS conditions
 * 
 * 5. **Monitoring & Debugging**:
 *    - Monitor connection pool usage in Supabase dashboard
 *    - Check query performance in database logs
 *    - Profile slow queries with EXPLAIN ANALYZE
 *    - Set up alerts for connection pool exhaustion
 * 
 * 6. **Caching Strategy**:
 *    - Cache read-heavy queries with SWR
 *    - Use Supabase real-time for critical updates
 *    - Implement cache invalidation on mutations
 *    - Consider Redis for distributed caching
 */

/**
 * Connection health check helper
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('oil_customers').select('count', { count: 'exact' })
    
    if (error) {
      console.error('Database health check failed:', error)
      return false
    }
    
    return true
  } catch (err) {
    console.error('Database connection error:', err)
    return false
  }
}
