import dayjs from 'dayjs'
import type { OrderStatus, UrgencyLevel, RepairType, SkillTag } from '@shared/types'
import { OrderStatusMap, UrgencyLevelMap, RepairTypeMap, SkillTagMap } from '@shared/types'

export function formatDate(date: string, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(format)
}

export function formatStatus(status: OrderStatus): string {
  return OrderStatusMap[status] || status
}

export function formatUrgency(urgency: UrgencyLevel): string {
  return UrgencyLevelMap[urgency] || urgency
}

export function formatRepairType(type: RepairType): string {
  return RepairTypeMap[type] || type
}

export function formatSkillTag(tag: SkillTag): string {
  return SkillTagMap[tag] || tag
}

export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}分钟`
  }
  if (hours < 24) {
    return `${Math.round(hours * 10) / 10}小时`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round((hours % 24) * 10) / 10
  return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`
}

export function getStatusClass(status: OrderStatus): string {
  return `status-${status}`
}

export function getUrgencyClass(urgency: UrgencyLevel): string {
  return `urgency-${urgency}`
}
