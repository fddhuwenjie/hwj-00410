import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (req, res) => {
  const { userId, userType } = req.query;
  
  let sql = 'SELECT * FROM notifications WHERE 1=1';
  const params: any[] = [];

  if (userId && userType) {
    sql += ' AND user_id = ? AND user_type = ?';
    params.push(userId, userType);
  }

  if (userType === 'admin') {
    sql = 'SELECT * FROM notifications WHERE user_type = ?';
    params.length = 0;
    params.push('admin');
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';

  const rows = db.prepare(sql).all(...params) as any[];
  
  const notifications = rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    userType: row.user_type,
    type: row.type,
    title: row.title,
    content: row.content,
    orderId: row.order_id,
    isRead: !!row.is_read,
    createdAt: row.created_at
  }));

  res.json(notifications);
});

router.put('/:id/read', (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
