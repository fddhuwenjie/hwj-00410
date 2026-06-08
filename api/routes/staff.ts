import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { mapStaffRow, toJsonField } from '../utils';
import type { SkillTag } from '@shared/types';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM staff ORDER BY created_at DESC').all() as any[];
  const staff = rows.map(row => mapStaffRow(row));
  res.json(staff);
});

router.get('/:id/workload', (req, res) => {
  const { id } = req.params;
  
  const currentCount = db.prepare(`
    SELECT COUNT(*) as count FROM work_orders 
    WHERE staff_id = ? AND status IN ('assigned', 'repairing', 'checking')
  `).get(id) as { count: number };

  const completedCount = db.prepare(`
    SELECT COUNT(*) as count FROM work_orders 
    WHERE staff_id = ? AND status = 'completed'
  `).get(id) as { count: number };

  const avgRating = db.prepare(`
    SELECT AVG(rating) as avg_rating FROM work_orders 
    WHERE staff_id = ? AND status = 'completed' AND rating IS NOT NULL
  `).get(id) as { avg_rating: number };

  res.json({
    currentOrderCount: currentCount.count,
    completedOrderCount: completedCount.count,
    avgRating: avgRating.avg_rating ? Math.round(avgRating.avg_rating * 10) / 10 : 0
  });
});

router.post('/', (req, res) => {
  const { name, phone, skills } = req.body;
  
  const workNo = `W${String(Date.now()).slice(-4)}`;
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO staff (id, name, phone, skills, work_no, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, phone, toJsonField(skills as SkillTag[]), workNo, now);

  const row = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any;
  res.json(mapStaffRow(row));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, skills } = req.body;

  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: '维修人员不存在' });
  }

  const stmt = db.prepare(`
    UPDATE staff SET name = ?, phone = ?, skills = ? WHERE id = ?
  `);
  stmt.run(name, phone, toJsonField(skills as SkillTag[]), id);

  const row = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any;
  res.json(mapStaffRow(row));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const hasOrders = db.prepare(`
    SELECT COUNT(*) as count FROM work_orders WHERE staff_id = ? AND status != 'completed'
  `).get(id) as { count: number };

  if (hasOrders.count > 0) {
    return res.status(400).json({ error: '该维修人员还有未完成的工单，无法删除' });
  }

  db.prepare('DELETE FROM staff WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
