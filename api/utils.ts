import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type { RepairType, OrderStatus, UrgencyLevel, SkillTag, WorkOrder, Staff, ProgressUpdate, StatusHistory, Notification } from '@shared/types';
import { RepairTypeToSkill } from '@shared/types';

export function generateOrderNo(): string {
  const date = dayjs().format('YYYYMMDD');
  const count = db.prepare('SELECT COUNT(*) as count FROM work_orders WHERE order_no LIKE ?').get(`WO${date}%`) as { count: number };
  const seq = String(count.count + 1).padStart(4, '0');
  return `WO${date}${seq}`;
}

export function isOrderTimeout(createdAt: string, status: OrderStatus): boolean {
  if (status === 'completed') return false;
  const diff = dayjs().diff(dayjs(createdAt), 'hour');
  return diff > 24;
}

export function parseJsonField<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

export function toJsonField(value: unknown): string {
  return JSON.stringify(value);
}

export function addNotification(
  userId: string,
  userType: 'owner' | 'staff' | 'admin',
  type: Notification['type'],
  title: string,
  content: string,
  orderId?: string
) {
  const stmt = db.prepare(`
    INSERT INTO notifications (id, user_id, user_type, type, title, content, order_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);
  stmt.run(uuidv4(), userId, userType, type, title, content, orderId || null, new Date().toISOString());
  console.log(`[通知Mock] ${userType} ${userId}: ${title} - ${content}`);
}

export function addStatusHistory(orderId: string, status: OrderStatus, remark?: string) {
  const stmt = db.prepare(`
    INSERT INTO status_history (id, order_id, status, remark, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(uuidv4(), orderId, status, remark || null, new Date().toISOString());
}

export function mapOrderRow(row: any): WorkOrder {
  const progressUpdates = db.prepare(`
    SELECT * FROM progress_updates WHERE order_id = ? ORDER BY created_at DESC
  `).all(row.id) as any[];

  const statusHistory = db.prepare(`
    SELECT * FROM status_history WHERE order_id = ? ORDER BY created_at ASC
  `).all(row.id) as any[];

  let staff: Staff | undefined;
  if (row.staff_id) {
    const staffRow = db.prepare('SELECT * FROM staff WHERE id = ?').get(row.staff_id) as any;
    if (staffRow) {
      staff = mapStaffRow(staffRow);
    }
  }

  return {
    id: row.id,
    orderNo: row.order_no,
    building: row.building,
    unit: row.unit,
    roomNo: row.room_no,
    repairType: row.repair_type as RepairType,
    description: row.description,
    urgency: row.urgency as UrgencyLevel,
    photoUrls: parseJsonField<string[]>(row.photo_urls, []),
    status: row.status as OrderStatus,
    staffId: row.staff_id,
    staff,
    ownerRoom: row.owner_room,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedAt: row.assigned_at,
    completedAt: row.completed_at,
    rating: row.rating,
    ratingComment: row.rating_comment,
    isTimeout: isOrderTimeout(row.created_at, row.status as OrderStatus),
    progressUpdates: progressUpdates.map((p: any) => ({
      id: p.id,
      orderId: p.order_id,
      staffId: p.staff_id,
      content: p.content,
      photoUrls: parseJsonField<string[]>(p.photo_urls, []),
      createdAt: p.created_at
    })),
    statusHistory: statusHistory.map((h: any) => ({
      id: h.id,
      orderId: h.order_id,
      status: h.status as OrderStatus,
      remark: h.remark,
      createdAt: h.created_at
    }))
  };
}

export function mapStaffRow(row: any): Staff {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    skills: parseJsonField<SkillTag[]>(row.skills, []),
    workNo: row.work_no,
    currentOrderCount: row.current_order_count,
    completedOrderCount: row.completed_order_count,
    avgRating: row.avg_rating,
    createdAt: row.created_at
  };
}

export function recommendStaff(repairType: RepairType): Staff[] {
  const requiredSkills = RepairTypeToSkill[repairType];
  const allStaff = db.prepare('SELECT * FROM staff ORDER BY current_order_count ASC').all() as any[];
  
  const staffWithScore = allStaff.map((row: any) => {
    const staff = mapStaffRow(row);
    const hasMatchingSkill = staff.skills.some(s => requiredSkills.includes(s));
    const score = (hasMatchingSkill ? 100 : 0) - staff.currentOrderCount * 10 + staff.avgRating * 5;
    return { staff, score, hasMatchingSkill };
  });

  return staffWithScore
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      ...item.staff,
      skills: item.staff.skills
    }));
}

export function getBuildingData() {
  const buildings = ['1号楼', '2号楼', '3号楼', '4号楼', '5号楼', '6号楼', '7号楼', '8号楼'];
  const units = ['1单元', '2单元', '3单元'];
  const rooms: string[] = [];
  for (let floor = 1; floor <= 15; floor++) {
    for (let room = 1; room <= 4; room++) {
      rooms.push(`${floor}0${room}`);
    }
  }
  
  return buildings.map(building => ({
    building,
    units: units.map(unit => ({
      unit,
      rooms
    }))
  }));
}
