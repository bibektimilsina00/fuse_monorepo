import api from '@/lib/api/client'

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name?: string
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>('/auth/login', data)
  return response.data
}

export async function register(data: RegisterRequest): Promise<User> {
  const response = await api.post<User>('/auth/register', data)
  return response.data
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>('/auth/me')
  return response.data
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/forgot-password', data)
  return response.data
}

export async function resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/reset-password', data)
  return response.data
}
