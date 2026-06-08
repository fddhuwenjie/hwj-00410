import { Router } from 'express';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { mapMaterialRow, addNotification } from '../utils';
import type { MaterialCategory } from '@shared/types';
import dayjs from 'dayjs';

const router = Router();

router.get('/', (req, res) => {
  const { category, lowStock, page = '1', pageSize = '20' } = req.query;
  
  let sql = 'SELECT * FROM materials WHERE 1=1';
  const params: any[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (lowStock === 'true') {
    sql += ' AND stock_quantity <= safety_threshold';
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const limit = parseInt(pageSize as string);
  const offset = (parseInt(page as string) - 1) * limit;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as any[];
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count').replace(' ORDER BY created_at DESC LIMIT ? OFFSET ?', '');
  const countParams = params.slice(0, -2);
  const { count } = db.prepare(countSql).get(...countParams) as { count: number };

  const materials = rows.map(row => mapMaterialRow(row));
  res.json({ data: materials, total: count });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: '物料不存在' });
  }
  res.json(mapMaterialRow(row));
});

router.post('/', (req, res) => {
  const { name, category, unit, unitPrice, stockQuantity, safetyThreshold } = req.body;
  const now = new Date().toISOString();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO materials (id, name, category, unit, unit_price, stock_quantity, safety_threshold, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, category, unit, unitPrice, stockQuantity, safetyThreshold, now, now);

  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  res.json(mapMaterialRow(material));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, unit, unitPrice, stockQuantity, safetyThreshold } = req.body;

  const materialRow = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  if (!materialRow) {
    return res.status(404).json({ error: '物料不存在' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE materials SET name = ?, category = ?, unit = ?, unit_price = ?, stock_quantity = ?, safety_threshold = ?, updated_at = ? WHERE id = ?
  `).run(name, category, unit, unitPrice, stockQuantity, safetyThreshold, now, id);

  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  res.json(mapMaterialRow(material));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const materialRow = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  if (!materialRow) {
    return res.status(404).json({ error: '物料不存在' });
  }

  const usageCount = db.prepare('SELECT COUNT(*) as count FROM material_usages WHERE material_id = ?').get(id) as { count: number };
  if (usageCount.count > 0) {
    return res.status(400).json({ error: '该物料已有领用记录，无法删除' });
  }

  db.prepare('DELETE FROM materials WHERE id = ?').run(id);
  res.json({ success: true });
});

router.post('/:id/stock', (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  const materialRow = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  if (!materialRow) {
    return res.status(404).json({ error: '物料不存在' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE materials SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?
  `).run(quantity, now, id);

  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  res.json(mapMaterialRow(material));
});

router.get('/usages', (req, res) => {
  const { orderId, materialId, staffId, startDate, endDate, page = '1', pageSize = '20' } = req.query;
  
  let sql = 'SELECT * FROM material_usages WHERE 1=1';
  const params: any[] = [];

  if (orderId) {
    sql += ' AND order_id = ?';
    params.push(orderId);
  }
  if (materialId) {
    sql += ' AND material_id = ?';
    params.push(materialId);
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

  const usages = rows.map(row => ({
    id: row.id,
    orderId: row.order_id,
    materialId: row.material_id,
    materialName: row.material_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    staffId: row.staff_id,
    createdAt: row.created_at
  }));

  res.json({ data: usages, total: count });
});

router.post('/usages', (req, res) => {
  const { orderId, materialId, quantity, staffId, unitPrice } = req.body;
  const now = new Date().toISOString();
  const id = uuidv4();

  const materialRow = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId) as any;
  if (!materialRow) {
    return res.status(404).json({ error: '物料不存在' });
  }

  if (materialRow.stock_quantity < quantity) {
    return res.status(400).json({ error: '库存不足' });
  }

  const orderRow = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(orderId) as any;
  if (!orderRow) {
    return res.status(404).json({ error: '工单不存在' });
  }

  const price = unitPrice !== undefined ? unitPrice : materialRow.unit_price;
  const totalPrice = price * quantity;

  const stmt = db.prepare(`
    INSERT INTO material_usages (id, order_id, material_id, material_name, quantity, unit_price, total_price, staff_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, orderId, materialId, materialRow.name, quantity, price, totalPrice, staffId, now);

  db.prepare(`
    UPDATE materials SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?
  `).run(quantity, now, materialId);

  db.prepare(`
    UPDATE work_orders SET material_cost = COALESCE(material_cost, 0) + ?, updated_at = ? WHERE id = ?
  `).run(totalPrice, now, orderId);

  const updatedMaterial = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId) as any;
  if (updatedMaterial.stock_quantity <= updatedMaterial.safety_threshold) {
    addNotification('admin', 'admin', 'timeout', '库存预警', `物料${materialRow.name}库存不足，请及时补货`, undefined);
  }

  const usage = {
    id,
    orderId,
    materialId,
    materialName: materialRow.name,
    quantity,
    unitPrice: price,
    totalPrice,
    staffId,
    createdAt: now
  };

  res.json(usage);
});

router.get('/stats/low-stock', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM materials WHERE stock_quantity <= safety_threshold ORDER BY stock_quantity ASC
  `).all() as any[];

  const materials = rows.map(row => mapMaterialRow(row));
  res.json({
    count: materials.length,
    materials
  });
});

router.get('/stats/monthly-usage', (req, res) => {
  const { months = '6' } = req.query;
  const monthCount = parseInt(months as string);
  
  const result: { category: MaterialCategory; month: string; quantity: number; amount: number }[] = [];
  const categories: MaterialCategory[] = ['管件', '电料', '五金'];
  
  for (let i = monthCount - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, 'month');
    const monthStr = date.format('YYYY-MM');
    const startOfMonth = date.startOf('month').toISOString();
    const endOfMonth = date.endOf('month').toISOString();

    for (const category of categories) {
      const row = db.prepare(`
        SELECT 
          COALESCE(SUM(quantity), 0) as total_quantity,
          COALESCE(SUM(total_price), 0) as total_amount
        FROM material_usages mu
        INNER JOIN materials m ON mu.material_id = m.id
        WHERE m.category = ? AND mu.created_at >= ? AND mu.created_at <= ?
      `).get(category, startOfMonth, endOfMonth) as { total_quantity: number; total_amount: number };

      result.push({
        category,
        month: monthStr,
        quantity: row.total_quantity,
        amount: row.total_amount
      });
    }
  }

  res.json(result);
});

router.get('/stats/category-summary', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      m.category,
      COUNT(*) as material_count,
      SUM(m.stock_quantity) as total_stock,
      SUM(CASE WHEN m.stock_quantity <= m.safety_threshold THEN 1 ELSE 0 END) as low_stock_count
    FROM materials m
    GROUP BY m.category
  `).all() as { category: MaterialCategory; material_count: number; total_stock: number; low_stock_count: number }[];

  res.json(rows);
});

export default router;