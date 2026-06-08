import { Router } from 'express';
import { db } from '../db';
import { isOrderTimeout, calculateSLA } from '../utils';
import dayjs from 'dayjs';
import type { RepairType, OrderStatus, UrgencyLevel } from '@shared/types';
import { RepairTypeMap, SLATimeLimits } from '@shared/types';

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

  const inspectionPlans = db.prepare(`SELECT * FROM inspection_plans WHERE is_active = 1`).all() as any[];
  let expectedCount = 0;
  const now = new Date();
  
  for (const plan of inspectionPlans) {
    const start = new Date(plan.created_at);
    const end = now;
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (plan.cycle === 'daily') {
      expectedCount += Math.max(0, Math.floor(days));
    } else if (plan.cycle === 'weekly') {
      expectedCount += Math.max(0, Math.floor(days / 7));
    } else if (plan.cycle === 'monthly') {
      expectedCount += Math.max(0, Math.floor(days / 30));
    }
  }

  const actualCountRow = db.prepare(`SELECT COUNT(*) as count FROM inspection_records`).get() as { count: number };
  const actualCount = actualCountRow.count;
  const inspectionCompletionRate = expectedCount > 0 ? Math.round((actualCount / expectedCount) * 100) / 100 : 1;

  const abnormalStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN abnormal_count > 0 THEN 1 ELSE 0 END) as abnormal_records
    FROM inspection_records
  `).get() as { total: number; abnormal_records: number };
  
  const abnormalDetectionRate = abnormalStats.total > 0 ? Math.round((abnormalStats.abnormal_records / abnormalStats.total) * 100) / 100 : 0;

  const lowStockCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM materials WHERE stock_quantity <= safety_threshold
  `).get() as { count: number };
  const lowStockCount = lowStockCountRow.count;

  const slaOrders = db.prepare(`
    SELECT id, urgency, created_at, first_response_at, resolved_at, assigned_at, status
    FROM work_orders
  `).all() as any[];

  const slaResponseRate: Record<UrgencyLevel, number> = { normal: 0, urgent: 0, very_urgent: 0 };
  const slaResolveRate: Record<UrgencyLevel, number> = { normal: 0, urgent: 0, very_urgent: 0 };

  const slaStatsByUrgency: Record<UrgencyLevel, { total: number; responseOnTime: number; resolveOnTime: number }> = {
    normal: { total: 0, responseOnTime: 0, resolveOnTime: 0 },
    urgent: { total: 0, responseOnTime: 0, resolveOnTime: 0 },
    very_urgent: { total: 0, responseOnTime: 0, resolveOnTime: 0 }
  };

  for (const order of slaOrders) {
    const urgency = order.urgency as UrgencyLevel;
    const sla = calculateSLA(
      order.created_at,
      urgency,
      order.first_response_at,
      order.resolved_at,
      order.assigned_at
    );
    
    slaStatsByUrgency[urgency].total++;
    
    const hasResponded = order.first_response_at || order.assigned_at;
    if (hasResponded && sla.responseStatus !== 'overdue') {
      slaStatsByUrgency[urgency].responseOnTime++;
    }
    
    if (order.status === 'completed' && sla.resolveStatus !== 'overdue') {
      slaStatsByUrgency[urgency].resolveOnTime++;
    }
  }

  for (const urgency of ['normal', 'urgent', 'very_urgent'] as UrgencyLevel[]) {
    const stats = slaStatsByUrgency[urgency];
    slaResponseRate[urgency] = stats.total > 0 ? Math.round((stats.responseOnTime / stats.total) * 100) / 100 : 1;
    slaResolveRate[urgency] = stats.total > 0 ? Math.round((stats.resolveOnTime / stats.total) * 100) / 100 : 1;
  }

  res.json({
    totalOrders: total.count,
    pendingOrders: pending.count,
    processingOrders: processing.count,
    completedOrders: completed.count,
    timeoutCount,
    timeoutRate,
    avgProcessingTime: avgTime,
    inspectionCompletionRate,
    abnormalDetectionRate,
    lowStockCount,
    slaResponseRate,
    slaResolveRate
  });
});

router.get('/sla-stats', (req, res) => {
  const slaOrders = db.prepare(`
    SELECT id, urgency, created_at, first_response_at, resolved_at, assigned_at, status
    FROM work_orders
  `).all() as any[];

  const slaStatsByUrgency: Record<UrgencyLevel, { total: number; responseOnTime: number; resolveOnTime: number }> = {
    normal: { total: 0, responseOnTime: 0, resolveOnTime: 0 },
    urgent: { total: 0, responseOnTime: 0, resolveOnTime: 0 },
    very_urgent: { total: 0, responseOnTime: 0, resolveOnTime: 0 }
  };

  for (const order of slaOrders) {
    const urgency = order.urgency as UrgencyLevel;
    const sla = calculateSLA(
      order.created_at,
      urgency,
      order.first_response_at,
      order.resolved_at,
      order.assigned_at
    );
    
    slaStatsByUrgency[urgency].total++;
    
    const hasResponded = order.first_response_at || order.assigned_at;
    if (hasResponded && sla.responseStatus !== 'overdue') {
      slaStatsByUrgency[urgency].responseOnTime++;
    }
    
    if (order.status === 'completed' && sla.resolveStatus !== 'overdue') {
      slaStatsByUrgency[urgency].resolveOnTime++;
    }
  }

  const result = (['normal', 'urgent', 'very_urgent'] as UrgencyLevel[]).map(urgency => {
    const stats = slaStatsByUrgency[urgency];
    return {
      urgency,
      total: stats.total,
      responseOnTime: stats.responseOnTime,
      resolveOnTime: stats.resolveOnTime,
      responseRate: stats.total > 0 ? Math.round((stats.responseOnTime / stats.total) * 100) / 100 : 1,
      resolveRate: stats.total > 0 ? Math.round((stats.resolveOnTime / stats.total) * 100) / 100 : 1
    };
  });

  res.json(result);
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