import request from '@/utils/request'
import type { DashboardStats, SLAStats } from '@shared/types'

export function getDashboardStats(): Promise<DashboardStats> {
  return request.get('/stats/dashboard')
}

export function getSLAStats(): Promise<SLAStats[]> {
  return request.get('/stats/sla-stats')
}

export function getOrdersByType(): Promise<{
  type: string
  name: string
  value: number
}[]> {
  return request.get('/stats/orders-by-type')
}

export function getAvgDuration(): Promise<{
  type: string
  name: string
  avgHours: number
}[]> {
  return request.get('/stats/avg-duration')
}

export function getStaffRanking(): Promise<{
  rank: number
  id: string
  name: string
  avgRating: number
  completedCount: number
}[]> {
  return request.get('/stats/staff-ranking')
}

export function getMonthlyTrend(): Promise<{
  month: string
  count: number
}[]> {
  return request.get('/stats/monthly-trend')
}

export function getTimeoutRate(): Promise<{
  type: string
  name: string
  total: number
  timeout: number
  rate: number
}[]> {
  return request.get('/stats/timeout-rate')
}
