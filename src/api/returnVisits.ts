import request from '@/utils/request'
import type { ReturnVisit, ReturnVisitStats } from '@shared/types'

interface ReturnVisitListResponse {
  data: ReturnVisit[]
  total: number
}

export function getReturnVisits(params?: {
  status?: string
  staffId?: string
  page?: number
  pageSize?: number
}): Promise<ReturnVisitListResponse> {
  return request.get('/return-visits', { params })
}

export function getReturnVisit(id: string): Promise<ReturnVisit> {
  return request.get(`/return-visits/${id}`)
}

export function getReturnVisitByOrder(orderId: string): Promise<ReturnVisit> {
  return request.get(`/return-visits/order/${orderId}`)
}

export function completeReturnVisit(id: string, data: {
  qualityScore: number
  attitudeScore: number
  speedScore: number
  hasRemainingIssue: boolean
  remainingIssueDesc?: string
  suggestion?: string
}): Promise<ReturnVisit> {
  return request.put(`/return-visits/${id}/complete`, data)
}

export function getReturnVisitStats(): Promise<ReturnVisitStats> {
  return request.get('/return-visits/stats')
}
