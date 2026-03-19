export interface User {
  id: string
  name?: string
  email?: string
  createdAt: number
  updatedAt: number
}

export interface UserPreferences {
  currency: 'USD' | 'CNY'
  notifications: {
    email: boolean
    push: boolean
  }
}
