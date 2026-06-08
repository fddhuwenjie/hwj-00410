import request from '@/utils/request'
import type { LoginRequest, LoginResponse } from '@shared/types'

export function login(data: LoginRequest): Promise<LoginResponse> {
  return request.post('/auth/login', data)
}
