import request from '@/utils/request'
import type { Bill, MonthlyRevenueStats } from '@shared/types'

interface BillListResponse {
  data: Bill[]
  total: number
}

export function getBills(params?: {
  ownerRoom?: string
  status?: string
  building?: string
  month?: string
  page?: number
  pageSize?: number
}): Promise<BillListResponse> {
  return request.get('/bills', { params })
}

export function getBill(id: string): Promise<Bill> {
  return request.get(`/bills/${id}`)
}

export function getBillByOrder(orderId: string): Promise<Bill> {
  return request.get(`/bills/order/${orderId}`)
}

export function payBill(id: string): Promise<Bill> {
  return request.put(`/bills/${id}/pay`)
}

export function getRevenueStats(params?: {
  month?: string
}): Promise<MonthlyRevenueStats> {
  return request.get('/bills/stats/revenue', { params })
}
