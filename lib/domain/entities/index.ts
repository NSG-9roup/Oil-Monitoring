export * from './auth'
export * from './customer'
export * from './product'
export * from './machine'
export * from './lab-test'
export * from './maintenance'

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}
