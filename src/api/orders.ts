import request from '@/utils/request'
import type { WorkOrder, ProgressUpdate, RepairType } from '@shared/types'

interface OrderListResponse {
  data: WorkOrder[]
  total: number
}

export function getOrders(params?: {
  status?: string
  ownerRoom?: string
  staffId?: string
  page?: number
  pageSize?: number
}): Promise<OrderListResponse> {
  return request.get('/orders', { params })
}

export function getOrder(id: string): Promise<WorkOrder> {
  return request.get(`/orders/${id}`)
}

export function createOrder(data: {
  building: string
  unit: string
  roomNo: string
  repairType: RepairType
  description: string
  urgency: string
  photoUrls?: string[]
}): Promise<WorkOrder> {
  return request.post('/orders', data)
}

export function assignOrder(id: string, staffId: string): Promise<WorkOrder> {
  return request.put(`/orders/${id}/assign`, { staffId })
}

export function updateOrderStatus(id: string, status: string, remark?: string): Promise<WorkOrder> {
  return request.put(`/orders/${id}/status`, { status, remark })
}

export function addProgress(id: string, data: {
  staffId: string
  content: string
  photoUrls?: string[]
}): Promise<ProgressUpdate> {
  return request.post(`/orders/${id}/progress`, data)
}

export function acceptOrder(id: string, accepted: boolean, rejectReason?: string): Promise<WorkOrder> {
  return request.put(`/orders/${id}/accept`, { accepted, rejectReason })
}

export function rateOrder(id: string, rating: number, comment: string): Promise<WorkOrder> {
  return request.post(`/orders/${id}/rate`, { rating, comment })
}

export function getRecommendedStaff(type: RepairType): Promise<any[]> {
  return request.get(`/orders/recommend/${type}`)
}
