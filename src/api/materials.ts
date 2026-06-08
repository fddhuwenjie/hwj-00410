import request from '@/utils/request'
import type { Material, MaterialUsage, MaterialCategory, MonthlyMaterialStats } from '@shared/types'

interface MaterialListResponse {
  data: Material[]
  total: number
}

interface UsageListResponse {
  data: MaterialUsage[]
  total: number
}

export function getMaterials(params?: {
  category?: MaterialCategory
  lowStock?: boolean
  page?: number
  pageSize?: number
}): Promise<MaterialListResponse> {
  return request.get('/materials', { params })
}

export function getMaterial(id: string): Promise<Material> {
  return request.get(`/materials/${id}`)
}

export function createMaterial(data: {
  name: string
  category: MaterialCategory
  unit: string
  unitPrice: number
  stockQuantity: number
  safetyThreshold: number
}): Promise<Material> {
  return request.post('/materials', data)
}

export function updateMaterial(id: string, data: {
  name: string
  category: MaterialCategory
  unit: string
  unitPrice: number
  stockQuantity: number
  safetyThreshold: number
}): Promise<Material> {
  return request.put(`/materials/${id}`, data)
}

export function deleteMaterial(id: string): Promise<{ success: boolean }> {
  return request.delete(`/materials/${id}`)
}

export function updateStock(id: string, quantity: number): Promise<Material> {
  return request.post(`/materials/${id}/stock`, { quantity })
}

export function getMaterialUsages(params?: {
  orderId?: string
  materialId?: string
  staffId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}): Promise<UsageListResponse> {
  return request.get('/materials/usages', { params })
}

export function createMaterialUsage(data: {
  orderId: string
  materialId: string
  quantity: number
  staffId: string
  unitPrice: number
}): Promise<MaterialUsage> {
  return request.post('/materials/usages', data)
}

export function getLowStockMaterials(): Promise<{
  count: number
  materials: Material[]
}> {
  return request.get('/materials/stats/low-stock')
}

export function getMonthlyMaterialUsage(months?: number): Promise<MonthlyMaterialStats[]> {
  return request.get('/materials/stats/monthly-usage', { params: { months } })
}

export function getCategorySummary(): Promise<{
  category: MaterialCategory
  material_count: number
  total_stock: number
  low_stock_count: number
}[]> {
  return request.get('/materials/stats/category-summary')
}
