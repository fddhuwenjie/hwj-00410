import request from '@/utils/request'
import type { BuildingData } from '@shared/types'

export function getBuildingData(): Promise<BuildingData[]> {
  return request.get('/buildings')
}
