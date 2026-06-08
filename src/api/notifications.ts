import request from '@/utils/request'
import type { Notification } from '@shared/types'

export function getNotifications(params?: {
  userId?: string
  userType?: string
}): Promise<Notification[]> {
  return request.get('/notifications', { params })
}

export function markAsRead(id: string): Promise<{ success: boolean }> {
  return request.put(`/notifications/${id}/read`)
}
