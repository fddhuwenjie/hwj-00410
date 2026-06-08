import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { addNotification } from '../utils';
import type { Announcement } from '@shared/types';

const router = Router();

function mapAnnouncementRow(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isPinned: !!row.is_pinned,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    createdAt: row.created_at
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM announcements 
    ORDER BY is_pinned DESC, created_at DESC
  `).all() as any[];
  const announcements = rows.map(mapAnnouncementRow);
  res.json(announcements);
});

router.get('/active', (req, res) => {
  const now = new Date().toISOString();
  const rows = db.prepare(`
    SELECT * FROM announcements 
    WHERE valid_from <= ? AND valid_to >= ?
    ORDER BY is_pinned DESC, created_at DESC
  `).all(now, now) as any[];
  const announcements = rows.map(mapAnnouncementRow);
  res.json(announcements);
});

router.post('/', (req, res) => {
  const { title, content, isPinned, validFrom, validTo } = req.body;
  
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO announcements (id, title, content, is_pinned, valid_from, valid_to, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, title, content, isPinned ? 1 : 0, validFrom, validTo, now);

  addNotification('all_owners', 'owner', 'announcement', '新公告发布', `物业发布了新公告：${title}`);

  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
  res.json(mapAnnouncementRow(row));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, isPinned, validFrom, validTo } = req.body;

  const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: '公告不存在' });
  }

  const stmt = db.prepare(`
    UPDATE announcements SET title = ?, content = ?, is_pinned = ?, valid_from = ?, valid_to = ? WHERE id = ?
  `);
  stmt.run(title, content, isPinned ? 1 : 0, validFrom, validTo, id);

  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
  res.json(mapAnnouncementRow(row));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
