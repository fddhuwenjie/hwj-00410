import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { generateOrderNo, addStatusHistory, addNotification, mapOrderRow, toJsonField, recommendStaff, setOrderSLADeadlines } from '../utils';
import type { WorkOrder, OrderStatus, RepairType, UrgencyLevel } from '@shared/types';

const router = Router();

router.get('/', (req, res) => {
  const { status, ownerRoom, staffId, page = '1', pageSize = '20' } = req.query;
  
  let sql = 'SELECT * FROM work_orders WHERE 1=1';
  const params: any[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (ownerRoom) {
    sql += ' AND owner_room = ?';
    params.push(ownerRoom);
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

  const orders = rows.map(row => mapOrderRow(row));
  res.json({ data: orders, total: count });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: '工单不存在' });
  }
  res.json(mapOrderRow(row));
});

router.post('/', (req, res) => {
  const { building, unit, roomNo, repairType, description, urgency, photoUrls = [] } = req.body;
  
  const orderNo = generateOrderNo();
  const ownerRoom = `${building}${unit}${roomNo}`;
  const now = new Date().toISOString();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO work_orders (id, order_no, building, unit, room_no, repair_type, description, urgency, photo_urls, status, owner_room, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `);
  stmt.run(id, orderNo, building, unit, roomNo, repairType, description, urgency, toJsonField(photoUrls), ownerRoom, now, now);

  setOrderSLADeadlines(id, urgency as UrgencyLevel, now);
  addStatusHistory(id, 'pending', '业主提交工单');

  const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  res.json(mapOrderRow(order));
});

router.put('/:id/assign', (req, res) => {
  const { staffId } = req.body;
  const { id } = req.params;

  const orderRow = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  if (!orderRow) {
    return res.status(404).json({ error: '工单不存在' });
  }

  const staffRow = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
  if (!staffRow) {
    return res.status(404).json({ error: '维修人员不存在' });
  }

  const now = new Date().toISOString();
  
  db.prepare(`
    UPDATE work_orders SET staff_id = ?, status = 'assigned', assigned_at = ?, first_response_at = COALESCE(first_response_at, ?), updated_at = ? WHERE id = ?
  `).run(staffId, now, now, now, id);

  db.prepare('UPDATE staff SET current_order_count = current_order_count + 1 WHERE id = ?').run(staffId);

  addStatusHistory(id, 'assigned', `分配给${staffRow.name}`);
  addNotification(staffRow.work_no, 'staff', 'new_order', '新工单分配', `您有新的工单需要处理：${orderRow.order_no}`, id);

  const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  res.json(mapOrderRow(order));
});

router.put('/:id/status', (req, res) => {
  const { status, remark } = req.body;
  const { id } = req.params;

  const orderRow = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  if (!orderRow) {
    return res.status(404).json({ error: '工单不存在' });
  }

  const now = new Date().toISOString();
  const updates: any[] = [];
  let sql = 'UPDATE work_orders SET status = ?, updated_at = ?';
  
  if (status === 'repairing') {
    sql += ', assigned_at = COALESCE(assigned_at, ?), first_response_at = COALESCE(first_response_at, ?)';
    updates.push(now, now);
  }
  if (status === 'completed' || status === 'checking') {
    sql += ', completed_at = ?, resolved_at = ?';
    updates.push(now, now);
  }
  
  sql += ' WHERE id = ?';
  updates.push(status, now, id);

  db.prepare(sql).run(...updates);

  if (status === 'completed' && orderRow.staff_id) {
    db.prepare('UPDATE staff SET current_order_count = current_order_count - 1, completed_order_count = completed_order_count + 1 WHERE id = ?').run(orderRow.staff_id);
  }

  addStatusHistory(id, status as OrderStatus, remark);

  if (status === 'checking') {
    addNotification(orderRow.owner_room, 'owner', 'order_update', '工单待验收', `您的工单${orderRow.order_no}维修完成，请验收`, id);
  }

  const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  res.json(mapOrderRow(order));
});

router.post('/:id/progress', (req, res) => {
  const { staffId, content, photoUrls = [] } = req.body;
  const { id } = req.params;

  const orderRow = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  if (!orderRow) {
    return res.status(404).json({ error: '工单不存在' });
  }

  const now = new Date().toISOString();
  const progressId = uuidv4();

  db.prepare(`
    INSERT INTO progress_updates (id, order_id, staff_id, content, photo_urls, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(progressId, id, staffId, content, toJsonField(photoUrls), now);

  db.prepare('UPDATE work_orders SET updated_at = ?, first_response_at = COALESCE(first_response_at, ?) WHERE id = ?').run(now, now, id);

  addNotification(orderRow.owner_room, 'owner', 'order_update', '工单进度更新', `您的工单${orderRow.order_no}维修进度已更新`, id);

  const progress = {
    id: progressId,
    orderId: id,
    staffId,
    content,
    photoUrls,
    createdAt: now
  };

  res.json(progress);
});

router.put('/:id/accept', (req, res) => {
  const { accepted, rejectReason } = req.body;
  const { id } = req.params;

  const orderRow = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  if (!orderRow) {
    return res.status(404).json({ error: '工单不存在' });
  }

  const now = new Date().toISOString();
  const newStatus: OrderStatus = accepted ? 'completed' : 'rejected';

  db.prepare(`
    UPDATE work_orders SET status = ?, updated_at = ?, completed_at = ?, resolved_at = ? WHERE id = ?
  `).run(newStatus, now, accepted ? now : orderRow.completed_at, accepted ? now : orderRow.resolved_at, id);

  if (accepted && orderRow.staff_id) {
    db.prepare('UPDATE staff SET current_order_count = current_order_count - 1, completed_order_count = completed_order_count + 1 WHERE id = ?').run(orderRow.staff_id);
  }

  if (!accepted && orderRow.staff_id) {
    const staffRow = db.prepare('SELECT * FROM staff WHERE id = ?').get(orderRow.staff_id) as any;
    addNotification(staffRow.work_no, 'staff', 'order_update', '工单被驳回', `工单${orderRow.order_no}被业主驳回，请重新维修`, id);
  }

  addStatusHistory(id, newStatus, accepted ? '业主验收通过' : `业主驳回：${rejectReason}`);

  const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  res.json(mapOrderRow(order));
});

router.post('/:id/rate', (req, res) => {
  const { rating, comment } = req.body;
  const { id } = req.params;

  const orderRow = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  if (!orderRow) {
    return res.status(404).json({ error: '工单不存在' });
  }

  db.prepare(`
    UPDATE work_orders SET rating = ?, rating_comment = ?, updated_at = ? WHERE id = ?
  `).run(rating, comment, new Date().toISOString(), id);

  if (orderRow.staff_id) {
    const avgRow = db.prepare(`
      SELECT AVG(rating) as avg_rating FROM work_orders 
      WHERE staff_id = ? AND status = 'completed' AND rating IS NOT NULL
    `).get(orderRow.staff_id) as { avg_rating: number };
    
    db.prepare('UPDATE staff SET avg_rating = ? WHERE id = ?').run(
      Math.round(avgRow.avg_rating * 10) / 10,
      orderRow.staff_id
    );
  }

  const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
  res.json(mapOrderRow(order));
});

router.get('/recommend/:type', (req, res) => {
  const repairType = req.params.type as RepairType;
  const recommended = recommendStaff(repairType);
  res.json(recommended);
});

export default router;
