import request from '@/utils/request'
import type { InspectionPlan, InspectionRecord, InspectionItemResult, InspectionCycle } from '@shared/types'

interface PlanListResponse {
  data: InspectionPlan[]
  total: number
}

interface RecordListResponse {
  data: InspectionRecord[]
  total: number
}

export function getInspectionPlans(params?: {
  isActive?: boolean
  page?: number
  pageSize?: number
}): Promise<PlanListResponse> {
  return request.get('/inspections/plans', { params })
}

export function getInspectionPlan(id: string): Promise<InspectionPlan> {
  return request.get(`/inspections/plans/${id}`)
}

export function createInspectionPlan(data: {
  name: string
  area: string
  cycle: InspectionCycle
  items: string[]
  createdBy: string
}): Promise<InspectionPlan> {
  return request.post('/inspections/plans', data)
}

export function updateInspectionPlan(id: string, data: {
  name: string
  area: string
  cycle: InspectionCycle
  items: string[]
  isActive: boolean
}): Promise<InspectionPlan> {
  return request.put(`/inspections/plans/${id}`, data)
}

export function deleteInspectionPlan(id: string): Promise<{ success: boolean }> {
  return request.delete(`/inspections/plans/${id}`)
}

export function getInspectionRecords(params?: {
  planId?: string
  staffId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}): Promise<RecordListResponse> {
  return request.get('/inspections/records', { params })
}

export function getInspectionRecord(id: string): Promise<InspectionRecord> {
  return request.get(`/inspections/records/${id}`)
}

export function createInspectionRecord(data: {
  planId: string
  staffId: string
  area: string
  itemsResult: InspectionItemResult[]
}): Promise<InspectionRecord> {
  return request.post('/inspections/records', data)
}

export function getInspectionCompletionRate(params?: {
  startDate?: string
  endDate?: string
}): Promise<{
  expectedCount: number
  actualCount: number
  completionRate: number
}> {
  return request.get('/inspections/stats/completion-rate', { params })
}

export function getInspectionAbnormalRate(params?: {
  startDate?: string
  endDate?: string
}): Promise<{
  totalRecords: number
  abnormalRecords: number
  totalAbnormalItems: number
  abnormalRate: number
}> {
  return request.get('/inspections/stats/abnormal-rate', { params })
}
