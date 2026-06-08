import request from '@/utils/request'
import type { Announcement } from '@shared/types'

export function getAnnouncements(): Promise<Announcement[]> {
  return request.get('/announcements')
}

export function getActiveAnnouncements(): Promise<Announcement[]> {
  return request.get('/announcements/active')
}

export function createAnnouncement(data: {
  title: string
  content: string
  isPinned: boolean
  validFrom: string
  validTo: string
}): Promise<Announcement> {
  return request.post('/announcements', data)
}

export function updateAnnouncement(id: string, data: {
  title: string
  content: string
  isPinned: boolean
  validFrom: string
  validTo: string
}): Promise<Announcement> {
  return request.put(`/announcements/${id}`, data)
}

export function deleteAnnouncement(id: string): Promise<{ success: boolean }> {
  return request.delete(`/announcements/${id}`)
}
