import dayjs from 'dayjs'
import type { OrderStatus, UrgencyLevel, RepairType, SkillTag, InspectionCycle, MaterialCategory, SLAInfo } from '@shared/types'
import { OrderStatusMap, UrgencyLevelMap, RepairTypeMap, SkillTagMap, InspectionCycleMap } from '@shared/types'

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

export function formatMinutes(minutes: number): string {
  if (minutes < 0) {
    const absMinutes = Math.abs(minutes)
    if (absMinutes < 60) {
      return `-${absMinutes}分钟`
    }
    const hours = Math.floor(absMinutes / 60)
    const mins = absMinutes % 60
    if (hours < 24) {
      return `-${hours}小时${mins > 0 ? mins + '分钟' : ''}`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `-${days}天${remainingHours > 0 ? remainingHours + '小时' : ''}`
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours < 24) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}天${remainingHours > 0 ? remainingHours + '小时' : ''}`
}

export function formatSLATime(remainingMinutes: number): string {
  return formatMinutes(remainingMinutes)
}

export function getSLAStatusClass(status: 'normal' | 'warning' | 'overdue'): string {
  const classMap: Record<string, string> = {
    normal: 'text-green-600',
    warning: 'text-yellow-600',
    overdue: 'text-red-600'
  }
  return classMap[status] || ''
}

export function isSLAWarning(sla?: SLAInfo): boolean {
  if (!sla) return false
  return sla.responseStatus === 'warning' || sla.resolveStatus === 'warning'
}

export function isSLAOverdue(sla?: SLAInfo): boolean {
  if (!sla) return false
  return sla.responseStatus === 'overdue' || sla.resolveStatus === 'overdue'
}

export function formatInspectionCycle(cycle: InspectionCycle): string {
  return InspectionCycleMap[cycle] || cycle
}

export function formatMaterialCategory(category: MaterialCategory): string {
  return category
}

export function getStatusClass(status: OrderStatus): string {
  return `status-${status}`
}

export function getUrgencyClass(urgency: UrgencyLevel): string {
  return `urgency-${urgency}`
}

export function formatCurrency(amount: number, currency = '¥'): string {
  return `${currency}${amount.toFixed(2)}`
}

