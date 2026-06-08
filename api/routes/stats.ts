import { Router } from 'express';
import { db } from '../db';
import { isOrderTimeout } from '../utils';
import dayjs from 'dayjs';
import type { RepairType, OrderStatus } from '@shared/types';
import { RepairTypeMap } from '@shared/types';

const router = Router();

router.get('/dashboard', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM work_orders').get() as { count: number };
  const pending = db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'pending'").get() as { count: number };
  const processing = db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('assigned', 'repairing')").get() as { count: number };
  const completed = db.prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'completed'").get() as { count: number };
  
  const allOrders = db.prepare('SELECT id, created_at, status FROM work_orders').all() as any[];
  const timeoutCount = allOrders.filter(o => isOrderTimeout(o.created_at, o.status)).length;
  const timeoutRate = total.count > 0 ? Math.round((timeoutCount / total.count) * 100) / 100 : 0;

  const completedWithTime = db.prepare(`
    SELECT created_at, completed_at FROM work_orders 
    WHERE status = 'completed' AND completed_at IS NOT NULL
  `).all() as { created_at: string; completed_at: string }[];

  let avgTime = 0;
  if (completedWithTime.length > 0) {
    const totalHours = completedWithTime.reduce((sum, o) => {
      return sum + dayjs(o.completed_at).diff(dayjs(o.created_at), 'hour');
    }, 0);
    avgTime = Math.round((totalHours / completedWithTime.length) * 10) / 10;
  }

  res.json({
    totalOrders: total.count,
    pendingOrders: pending.count,
    processingOrders: processing.count,
    completedOrders: completed.count,
    timeoutCount,
    timeoutRate,
    avgProcessingTime: avgTime
  });
});

router.get('/orders-by-type', (req, res) => {
  const rows = db.prepare(`
    SELECT repair_type as type, COUNT(*) as count 
    FROM work_orders 
    GROUP BY repair_type
  `).all() as { type: RepairType; count: number }[];

  const data = rows.map(row => ({
    type: row.type,
    name: RepairTypeMap[row.type],
    value: row.count
  }));

  res.json(data);
});

router.get('/avg-duration', (req, res) => {
  const rows = db.prepare(`
    SELECT repair_type as type, 
           AVG(julianday(completed_at) - julianday(created_at)) * 24 as avg_hours
    FROM work_orders 
    WHERE status = 'completed' AND completed_at IS NOT NULL
    GROUP BY repair_type
  `).all() as { type: RepairType; avg_hours: number }[];

  const data = rows.map(row => ({
    type: row.type,
    name: RepairTypeMap[row.type],
    avgHours: Math.round(row.avg_hours * 10) / 10
  }));

  res.json(data);
});

router.get('/staff-ranking', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.name, s.avg_rating, 
           COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END) as completed_count
    FROM staff s
    LEFT JOIN work_orders wo ON s.id = wo.staff_id
    GROUP BY s.id
    ORDER BY s.avg_rating DESC, completed_count DESC
  `).all() as { id: string; name: string; avg_rating: number; completed_count: number }[];

  const data = rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    name: row.name,
    avgRating: row.avg_rating,
    completedCount: row.completed_count
  }));

  res.json(data);
});

router.get('/monthly-trend', (req, res) => {
  const months: { month: string; count: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = dayjs().subtract(i, 'month');
    const monthStr = date.format('YYYY-MM');
    const startOfMonth = date.startOf('month').toISOString();
    const endOfMonth = date.endOf('month').toISOString();

    const row = db.prepare(`
      SELECT COUNT(*) as count FROM work_orders 
      WHERE created_at >= ? AND created_at <= ?
    `).get(startOfMonth, endOfMonth) as { count: number };

    months.push({
      month: monthStr,
      count: row.count
    });
  }

  res.json(months);
});

router.get('/timeout-rate', (req, res) => {
  const allOrders = db.prepare(`
    SELECT repair_type as type, status, created_at FROM work_orders
  `).all() as { type: RepairType; status: OrderStatus; created_at: string }[];

  const typeStats: Record<string, { total: number; timeout: number }> = {};

  for (const order of allOrders) {
    if (!typeStats[order.type]) {
      typeStats[order.type] = { total: 0, timeout: 0 };
    }
    typeStats[order.type].total++;
    if (isOrderTimeout(order.created_at, order.status)) {
      typeStats[order.type].timeout++;
    }
  }

  const data = Object.entries(typeStats).map(([type, stats]) => ({
    type: type as RepairType,
    name: RepairTypeMap[type as RepairType],
    total: stats.total,
    timeout: stats.timeout,
    rate: stats.total > 0 ? Math.round((stats.timeout / stats.total) * 100) / 100 : 0
  }));

  res.json(data);
});

export default router;
