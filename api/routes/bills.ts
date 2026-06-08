import { Router } from 'express';
import { db } from '../db';
import { mapBillRow, generateBill } from '../utils';
import type { Bill, MonthlyRevenueStats } from '@shared/types';

const router = Router();

router.get('/', (req, res) => {
  const { ownerRoom, status, building, month, page = '1', pageSize = '20' } = req.query;
  
  let sql = 'SELECT * FROM bills WHERE 1=1';
  const params: any[] = [];

  if (ownerRoom) {
    sql += ' AND owner_room = ?';
    params.push(ownerRoom);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (building) {
    sql += ' AND building = ?';
    params.push(building);
  }
  if (month) {
    sql += ' AND strftime(\'%Y-%m\', created_at) = ?';
    params.push(month);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const limit = parseInt(pageSize as string);
  const offset = (parseInt(page as string) - 1) * limit;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as any[];
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count').replace(' ORDER BY created_at DESC LIMIT ? OFFSET ?', '');
  const countParams = params.slice(0, -2);
  const { count } = db.prepare(countSql).get(...countParams) as { count: number };

  const bills = rows.map(row => mapBillRow(row));
  res.json({ data: bills, total: count });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: '账单不存在' });
  }
  res.json(mapBillRow(row));
});

router.get('/order/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  let row = db.prepare('SELECT * FROM bills WHERE order_id = ?').get(orderId) as any;
  
  if (!row) {
    const generatedBill = generateBill(orderId);
    if (generatedBill) {
      return res.json(generatedBill);
    }
    return res.status(404).json({ error: '账单不存在且无法生成' });
  }
  
  res.json(mapBillRow(row));
});

router.put('/:id/pay', (req, res) => {
  const { id } = req.params;

  const billRow = db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as any;
  if (!billRow) {
    return res.status(404).json({ error: '账单不存在' });
  }

  const now = new Date().toISOString();
  
  db.prepare('UPDATE bills SET status = ?, paid_at = ? WHERE id = ?').run('paid', now, id);

  const updatedRow = db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as any;
  res.json(mapBillRow(updatedRow));
});

router.get('/stats/revenue', (req, res) => {
  const { month } = req.query;
  
  let whereClause = 'WHERE status = \'paid\'';
  const params: any[] = [];

  if (month) {
    whereClause += ' AND strftime(\'%Y-%m\', paid_at) = ?';
    params.push(month);
  }

  const aggregateSql = `
    SELECT 
      SUM(total_amount) as totalRevenue,
      SUM(labor_cost) as laborRevenue,
      SUM(material_cost) as materialRevenue,
      SUM(visit_fee) as visitFeeRevenue
    FROM bills
    ${whereClause}
  `;
  const aggregate = db.prepare(aggregateSql).get(...params) as any;

  const byBuildingSql = `
    SELECT building, SUM(total_amount) as amount
    FROM bills
    ${whereClause}
    GROUP BY building
    ORDER BY amount DESC
  `;
  const byBuildingRows = db.prepare(byBuildingSql).all(...params) as any[];

  const byDateSql = `
    SELECT strftime('%Y-%m-%d', paid_at) as date, SUM(total_amount) as amount
    FROM bills
    ${whereClause}
    GROUP BY strftime('%Y-%m-%d', paid_at)
    ORDER BY date ASC
  `;
  const byDateRows = db.prepare(byDateSql).all(...params) as any[];

  const stats: MonthlyRevenueStats = {
    totalRevenue: aggregate.totalRevenue || 0,
    laborRevenue: aggregate.laborRevenue || 0,
    materialRevenue: aggregate.materialRevenue || 0,
    visitFeeRevenue: aggregate.visitFeeRevenue || 0,
    byBuilding: byBuildingRows.map(row => ({
      building: row.building,
      amount: row.amount
    })),
    byDate: byDateRows.map(row => ({
      date: row.date,
      amount: row.amount
    }))
  };

  res.json(stats);
});

export default router;
