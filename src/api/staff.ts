import request from '@/utils/request'
import type { Staff, SkillTag } from '@shared/types'

export function getStaffList(): Promise<Staff[]> {
  return request.get('/staff')
}

export function getStaffWorkload(id: string): Promise<{
  currentOrderCount: number
  completedOrderCount: number
  avgRating: number
}> {
  return request.get(`/staff/${id}/workload`)
}

export function createStaff(data: {
  name: string
  phone: string
  skills: SkillTag[]
}): Promise<Staff> {
  return request.post('/staff', data)
}

export function updateStaff(id: string, data: {
  name: string
  phone: string
  skills: SkillTag[]
}): Promise<Staff> {
  return request.put(`/staff/${id}`, data)
}

export function deleteStaff(id: string): Promise<{ success: boolean }> {
  return request.delete(`/staff/${id}`)
}
