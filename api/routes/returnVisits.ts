import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { mapReturnVisitRow, updateStaffComprehensiveSatisfaction } from '../utils';
import type { ReturnVisit, ReturnVisitStats } from '@shared/types';

const router = Router();

router.get('/', (req, res) => {
  const { status, staffId, page = '1', pageSize = '20' } = req.query;
  
  let sql = 'SELECT * FROM return_visits WHERE 1=1';
  const params: any[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (staffId) {
    sql += ' AND staff_id = ?';
    params.push(staffId);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const limit = parseInt(pageSize as string);
  const offset = (parseInt(page as string) - 1) * limit;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as any[];
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count').replace(' ORDER BY created_at DESC LIMIT ? OFFSET ?', '');
  const countParams = params.slice(0, -2);
  const { count } = db.prepare(countSql).get(...countParams) as { count: number };

  const returnVisits = rows.map(row => mapReturnVisitRow(row));
  res.json({ data: returnVisits, total: count });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM return_visits WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: '回访不存在' });
  }
  res.json(mapReturnVisitRow(row));
});

router.get('/order/:orderId', (req, res) => {
  const row = db.prepare('SELECT * FROM return_visits WHERE order_id = ?').get(req.params.orderId) as any;
  if (!row) {
    return res.status(404).json({ error: '该工单暂无回访记录' });
  }
  res.json(mapReturnVisitRow(row));
});

router.put('/:id/complete', (req, res) => {
  const { id } = req.params;
  const { qualityScore, attitudeScore, speedScore, hasRemainingIssue, remainingIssueDesc, suggestion } = req.body;

  const visitRow = db.prepare('SELECT * FROM return_visits WHERE id = ?').get(id) as any;
  if (!visitRow) {
    return res.status(404).json({ error: '回访不存在' });
  }

  if (visitRow.status === 'completed') {
    return res.status(400).json({ error: '该回访已完成，无法重复提交' });
  }

  if (qualityScore < 1 || qualityScore > 5 || attitudeScore < 1 || attitudeScore > 5 || speedScore < 1 || speedScore > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE return_visits SET 
      quality_score = ?,
      attitude_score = ?,
      speed_score = ?,
      has_remaining_issue = ?,
      remaining_issue_desc = ?,
      suggestion = ?,
      status = 'completed',
      completed_at = ?
    WHERE id = ?
  `).run(
    qualityScore,
    attitudeScore,
    speedScore,
    hasRemainingIssue ? 1 : 0,
    remainingIssueDesc || null,
    suggestion || null,
    now,
    id
  );

  updateStaffComprehensiveSatisfaction(visitRow.staff_id);

  const updatedRow = db.prepare('SELECT * FROM return_visits WHERE id = ?').get(id) as any;
  res.json(mapReturnVisitRow(updatedRow));
});

router.get('/stats', (req, res) => {
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM return_visits').get() as { count: number };
  const completedRow = db.prepare("SELECT COUNT(*) as count FROM return_visits WHERE status = 'completed'").get() as { count: number };
  const pendingRow = db.prepare("SELECT COUNT(*) as count FROM return_visits WHERE status = 'pending'").get() as { count: number };

  const totalVisits = totalRow.count;
  const completedVisits = completedRow.count;
  const pendingVisits = pendingRow.count;
  const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) / 100 : 0;

  const avgScores = db.prepare(`
    SELECT 
      AVG(quality_score) as avg_quality,
      AVG(attitude_score) as avg_attitude,
      AVG(speed_score) as avg_speed
    FROM return_visits 
    WHERE status = 'completed'
  `).get() as { avg_quality: number; avg_attitude: number; avg_speed: number };

  const avgQualityScore = avgScores.avg_quality ? Math.round(avgScores.avg_quality * 10) / 10 : 0;
  const avgAttitudeScore = avgScores.avg_attitude ? Math.round(avgScores.avg_attitude * 10) / 10 : 0;
  const avgSpeedScore = avgScores.avg_speed ? Math.round(avgScores.avg_speed * 10) / 10 : 0;
  const avgOverallScore = completedVisits > 0 
    ? Math.round(((avgQualityScore * 0.4) + (avgAttitudeScore * 0.3) + (avgSpeedScore * 0.3)) * 10) / 10 
    : 0;

  const staffStatsRows = db.prepare(`
    SELECT 
      rv.staff_id,
      rv.staff_name,
      COUNT(*) as visit_count,
      AVG(rv.quality_score) as avg_quality,
      AVG(rv.attitude_score) as avg_attitude,
      AVG(rv.speed_score) as avg_speed
    FROM return_visits rv
    WHERE rv.status = 'completed'
    GROUP BY rv.staff_id, rv.staff_name
    ORDER BY visit_count DESC
  `).all() as { 
    staff_id: string; 
    staff_name: string; 
    visit_count: number; 
    avg_quality: number; 
    avg_attitude: number; 
    avg_speed: number; 
  }[];

  const byStaff = staffStatsRows.map(row => ({
    staffId: row.staff_id,
    staffName: row.staff_name,
    avgOverallScore: Math.round(((row.avg_quality * 0.4) + (row.avg_attitude * 0.3) + (row.avg_speed * 0.3)) * 10) / 10,
    visitCount: row.visit_count
  }));

  const stats: ReturnVisitStats = {
    totalVisits,
    completedVisits,
    pendingVisits,
    completionRate,
    avgQualityScore,
    avgAttitudeScore,
    avgSpeedScore,
    avgOverallScore,
    byStaff
  };

  res.json(stats);
});

export default router;
