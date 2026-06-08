import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { mapKnowledgeArticleRow, matchKnowledgeArticles, toJsonField } from '../utils';
import type { KnowledgeArticle, KnowledgeStats, KnowledgeCategory } from '@shared/types';

const router = Router();

router.get('/', (req, res) => {
  const { category, keyword, page = '1', pageSize = '20' } = req.query;

  let sql = 'SELECT * FROM knowledge_articles WHERE 1=1';
  const params: any[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (keyword) {
    sql += ' AND (title LIKE ? OR content LIKE ?)';
    const keywordPattern = `%${keyword}%`;
    params.push(keywordPattern, keywordPattern);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const limit = parseInt(pageSize as string);
  const offset = (parseInt(page as string) - 1) * limit;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as any[];
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count').replace(' ORDER BY created_at DESC LIMIT ? OFFSET ?', '');
  const countParams = params.slice(0, -2);
  const { count } = db.prepare(countSql).get(...countParams) as { count: number };

  const articles = rows.map(row => mapKnowledgeArticleRow(row));
  res.json({ data: articles, total: count });
});

router.get('/stats', (req, res) => {
  const { count: totalArticles } = db.prepare('SELECT COUNT(*) as count FROM knowledge_articles').get() as { count: number };
  const { total: totalViews } = db.prepare('SELECT COALESCE(SUM(view_count), 0) as total FROM knowledge_articles').get() as { total: number };
  const { total: totalHelpful } = db.prepare('SELECT COALESCE(SUM(helpful_count), 0) as total FROM knowledge_articles').get() as { total: number };

  const { count: selfServiceCount } = db.prepare('SELECT COUNT(*) as count FROM self_service_records').get() as { count: number };
  const { count: orderCount } = db.prepare('SELECT COUNT(*) as count FROM work_orders').get() as { count: number };
  const totalConsultations = selfServiceCount + orderCount;
  const selfServiceRate = totalConsultations > 0 ? Math.round((selfServiceCount / totalConsultations) * 10000) / 100 : 0;

  const topRows = db.prepare('SELECT * FROM knowledge_articles ORDER BY view_count DESC LIMIT 10').all() as any[];
  const topArticles = topRows.map(row => mapKnowledgeArticleRow(row));

  const stats: KnowledgeStats = {
    totalArticles,
    totalViews,
    totalHelpful,
    selfServiceCount,
    totalConsultations,
    selfServiceRate,
    topArticles
  };

  res.json(stats);
});

router.get('/match/:query', (req, res) => {
  const { query } = req.params;
  const results = matchKnowledgeArticles(query, 3);
  res.json(results);
});

router.post('/', (req, res) => {
  const { title, category, content, keywords = [] } = req.body;

  const now = new Date().toISOString();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO knowledge_articles (id, title, category, content, keywords, view_count, helpful_count, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, 'admin', ?, ?)
  `);
  stmt.run(id, title, category, content, toJsonField(keywords), now, now);

  const row = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id) as any;
  res.json(mapKnowledgeArticleRow(row));
});

router.post('/self-service', (req, res) => {
  const { ownerRoom, queryText, matchedArticleId, matchedArticleTitle, isResolved } = req.body;

  const now = new Date().toISOString();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO self_service_records (id, owner_room, query_text, matched_article_id, matched_article_title, is_resolved, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, ownerRoom, queryText, matchedArticleId || null, matchedArticleTitle || null, isResolved ? 1 : 0, now);

  res.json({
    id,
    ownerRoom,
    queryText,
    matchedArticleId: matchedArticleId || null,
    matchedArticleTitle: matchedArticleTitle || null,
    isResolved,
    createdAt: now
  });
});

router.get('/:id', (req, res) => {
  db.prepare('UPDATE knowledge_articles SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);

  const row = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: '文章不存在' });
  }
  res.json(mapKnowledgeArticleRow(row));
});

router.put('/:id', (req, res) => {
  const { title, category, content, keywords } = req.body;
  const { id } = req.params;

  const existingRow = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id) as any;
  if (!existingRow) {
    return res.status(404).json({ error: '文章不存在' });
  }

  const now = new Date().toISOString();
  const updates: any[] = [];
  let sql = 'UPDATE knowledge_articles SET updated_at = ?';
  updates.push(now);

  if (title !== undefined) {
    sql += ', title = ?';
    updates.push(title);
  }
  if (category !== undefined) {
    sql += ', category = ?';
    updates.push(category);
  }
  if (content !== undefined) {
    sql += ', content = ?';
    updates.push(content);
  }
  if (keywords !== undefined) {
    sql += ', keywords = ?';
    updates.push(toJsonField(keywords));
  }

  sql += ' WHERE id = ?';
  updates.push(id);

  db.prepare(sql).run(...updates);

  const row = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id) as any;
  res.json(mapKnowledgeArticleRow(row));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existingRow = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id) as any;
  if (!existingRow) {
    return res.status(404).json({ error: '文章不存在' });
  }

  db.prepare('DELETE FROM knowledge_articles WHERE id = ?').run(id);
  res.json({ success: true });
});

router.post('/:id/helpful', (req, res) => {
  const { id } = req.params;

  const existingRow = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id) as any;
  if (!existingRow) {
    return res.status(404).json({ error: '文章不存在' });
  }

  db.prepare('UPDATE knowledge_articles SET helpful_count = helpful_count + 1 WHERE id = ?').run(id);

  const row = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id) as any;
  res.json(mapKnowledgeArticleRow(row));
});

export default router;
