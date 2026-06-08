import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { mapInspectionPlanRow, mapInspectionRecordRow, toJsonField, addNotification, generateOrderNo } from '../utils';
import type { InspectionCycle, InspectionItemResult, UrgencyLevel, RepairType } from '@shared/types';

const router = Router();

router.get('/plans', (req, res) => {
  const { isActive, page = '1', pageSize = '20' } = req.query;
  
  let sql = 'SELECT * FROM inspection_plans WHERE 1=1';
  const params: any[] = [];

  if (isActive !== undefined && isActive !== '') {
    sql += ' AND is_active = ?';
    params.push(isActive === 'true' ? 1 : 0);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const limit = parseInt(pageSize as string);
  const offset = (parseInt(page as string) - 1) * limit;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as any[];
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count').replace(' ORDER BY created_at DESC LIMIT ? OFFSET ?', '');
  const countParams = params.slice(0, -2);
  const { count } = db.prepare(countSql).get(...countParams) as { count: number };

  const plans = rows.map(row => mapInspectionPlanRow(row));
  res.json({ data: plans, total: count });
});

router.get('/plans/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM inspection_plans WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: '巡检计划不存在' });
  }
  res.json(mapInspectionPlanRow(row));
});

router.post('/plans', (req, res) => {
  const { name, area, cycle, items, createdBy } = req.body;
  const now = new Date().toISOString();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO inspection_plans (id, name, area, cycle, items, created_by, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  stmt.run(id, name, area, cycle, toJsonField(items), createdBy, now, now);

  const plan = db.prepare('SELECT * FROM inspection_plans WHERE id = ?').get(id) as any;
  res.json(mapInspectionPlanRow(plan));
});

router.put('/plans/:id', (req, res) => {
  const { id } = req.params;
  const { name, area, cycle, items, isActive } = req.body;

  const planRow = db.prepare('SELECT * FROM inspection_plans WHERE id = ?').get(id) as any;
  if (!planRow) {
    return res.status(404).json({ error: '巡检计划不存在' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE inspection_plans SET name = ?, area = ?, cycle = ?, items = ?, is_active = ?, updated_at = ? WHERE id = ?
  `).run(name, area, cycle, toJsonField(items), isActive ? 1 : 0, now, id);

  const plan = db.prepare('SELECT * FROM inspection_plans WHERE id = ?').get(id) as any;
  res.json(mapInspectionPlanRow(plan));
});

router.delete('/plans/:id', (req, res) => {
  const { id } = req.params;

  const planRow = db.prepare('SELECT * FROM inspection_plans WHERE id = ?').get(id) as any;
  if (!planRow) {
    return res.status(404).json({ error: '巡检计划不存在' });
  }

  const recordsCount = db.prepare('SELECT COUNT(*) as count FROM inspection_records WHERE plan_id = ?').get(id) as { count: number };
  if (recordsCount.count > 0) {
    return res.status(400).json({ error: '该计划已有巡检记录，无法删除' });
  }

  db.prepare('DELETE FROM inspection_plans WHERE id = ?').run(id);
  res.json({ success: true });
});

router.get('/records', (req, res) => {
  const { planId, staffId, startDate, endDate, page = '1', pageSize = '20' } = req.query;
  
  let sql = 'SELECT * FROM inspection_records WHERE 1=1';
  const params: any[] = [];

  if (planId) {
    sql += ' AND plan_id = ?';
    params.push(planId);
  }
  if (staffId) {
    sql += ' AND staff_id = ?';
    params.push(staffId);
  }
  if (startDate) {
    sql += ' AND created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND created_at <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const limit = parseInt(pageSize as string);
  const offset = (parseInt(page as string) - 1) * limit;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as any[];
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count').replace(' ORDER BY created_at DESC LIMIT ? OFFSET ?', '');
  const countParams = params.slice(0, -2);
  const { count } = db.prepare(countSql).get(...countParams) as { count: number };

  const records = rows.map(row => mapInspectionRecordRow(row));
  res.json({ data: records, total: count });
});

router.get('/records/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM inspection_records WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: '巡检记录不存在' });
  }
  res.json(mapInspectionRecordRow(row));
});

router.post('/records', (req, res) => {
  const { planId, staffId, area, itemsResult } = req.body;
  const now = new Date().toISOString();
  const id = uuidv4();

  const planRow = db.prepare('SELECT * FROM inspection_plans WHERE id = ?').get(planId) as any;
  if (!planRow) {
    return res.status(404).json({ error: '巡检计划不存在' });
  }

  const staffRow = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
  if (!staffRow) {
    return res.status(404).json({ error: '维修人员不存在' });
  }

  const abnormalCount = itemsResult.filter((item: InspectionItemResult) => item.status === 'abnormal').length;

  const stmt = db.prepare(`
    INSERT INTO inspection_records (id, plan_id, staff_id, area, items_result, abnormal_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, planId, staffId, area, toJsonField(itemsResult), abnormalCount, now);

  const abnormalItems = itemsResult.filter((item: InspectionItemResult) => item.status === 'abnormal');
  for (const item of abnormalItems) {
    const orderId = uuidv4();
    const orderNo = generateOrderNo();
    const description = `巡检发现异常：${item.item}${item.remark ? ` - ${item.remark}` : ''}`;
    
    const orderStmt = db.prepare(`
      INSERT INTO work_orders (id, order_no, building, unit, room_no, repair_type, description, urgency, photo_urls, status, owner_room, created_at, updated_at, material_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 0)
    `);
    orderStmt.run(
      orderId, orderNo, area, '公共区域', '巡检', 'public', description, 'normal', '[]', '巡检工单', now, now
    );

    addNotification('admin', 'admin', 'new_order', '巡检异常工单', `巡检发现异常，已自动生成工单：${orderNo}`, orderId);
  }

  const record = db.prepare('SELECT * FROM inspection_records WHERE id = ?').get(id) as any;
  res.json(mapInspectionRecordRow(record));
});

router.get('/stats/completion-rate', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = '';
  const params: any[] = [];
  
  if (startDate) {
    dateFilter += ' AND created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND created_at <= ?';
    params.push(endDate);
  }

  const plans = db.prepare(`SELECT * FROM inspection_plans WHERE is_active = 1`).all() as any[];
  
  let expectedCount = 0;
  const now = new Date();
  
  for (const plan of plans) {
    const start = startDate ? new Date(startDate as string) : new Date(plan.created_at);
    const end = endDate ? new Date(endDate as string) : now;
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (plan.cycle === 'daily') {
      expectedCount += Math.max(0, Math.floor(days));
    } else if (plan.cycle === 'weekly') {
      expectedCount += Math.max(0, Math.floor(days / 7));
    } else if (plan.cycle === 'monthly') {
      expectedCount += Math.max(0, Math.floor(days / 30));
    }
  }

  const actualSql = `SELECT COUNT(*) as count FROM inspection_records WHERE 1=1${dateFilter}`;
  const { count: actualCount } = db.prepare(actualSql).get(...params) as { count: number };

  const completionRate = expectedCount > 0 ? Math.round((actualCount / expectedCount) * 100) / 100 : 1;

  res.json({
    expectedCount,
    actualCount,
    completionRate
  });
});

router.get('/stats/abnormal-rate', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = '';
  const params: any[] = [];
  
  if (startDate) {
    dateFilter += ' AND created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND created_at <= ?';
    params.push(endDate);
  }

  const sql = `SELECT 
    COUNT(*) as total,
    SUM(abnormal_count) as total_abnormal,
    SUM(CASE WHEN abnormal_count > 0 THEN 1 ELSE 0 END) as abnormal_records
  FROM inspection_records
  WHERE 1=1${dateFilter}`;
  
  const result = db.prepare(sql).get(...params) as { total: number; total_abnormal: number; abnormal_records: number };

  const abnormalRate = result.total > 0 ? Math.round((result.abnormal_records / result.total) * 100) / 100 : 0;

  res.json({
    totalRecords: result.total,
    abnormalRecords: result.abnormal_records || 0,
    totalAbnormalItems: result.total_abnormal || 0,
    abnormalRate
  });
});

export default router;