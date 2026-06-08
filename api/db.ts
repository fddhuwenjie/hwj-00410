import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'repair.db');

export let db: Database.Database;

export function initDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      skills TEXT NOT NULL,
      work_no TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL DEFAULT '123456',
      current_order_count INTEGER DEFAULT 0,
      completed_order_count INTEGER DEFAULT 0,
      avg_rating REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      building TEXT NOT NULL,
      unit TEXT NOT NULL,
      room_no TEXT NOT NULL,
      repair_type TEXT NOT NULL,
      description TEXT NOT NULL,
      urgency TEXT NOT NULL,
      photo_urls TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      staff_id TEXT,
      owner_room TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      assigned_at TEXT,
      completed_at TEXT,
      rating INTEGER,
      rating_comment TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS progress_updates (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      content TEXT NOT NULL,
      photo_urls TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id),
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_type TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      order_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON work_orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_staff ON work_orders(staff_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON work_orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_progress_order ON progress_updates(order_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type);
  `);
}

export function seedData() {
  const staffCount = db.prepare('SELECT COUNT(*) as count FROM staff').get() as { count: number };
  if (staffCount.count > 0) return;

  const insertStaff = db.prepare(`
    INSERT INTO staff (id, name, phone, skills, work_no, current_order_count, completed_order_count, avg_rating, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const staff = [
    ['s1', '张师傅', '13800138001', '["water_electric","general"]', 'W001', 1, 45, 4.7, '2024-01-01T00:00:00Z'],
    ['s2', '李师傅', '13800138002', '["carpentry","tiler"]', 'W002', 1, 38, 4.5, '2024-01-15T00:00:00Z'],
    ['s3', '王师傅', '13800138003', '["water_electric","tiler","general"]', 'W003', 0, 52, 4.8, '2024-02-01T00:00:00Z']
  ];

  for (const s of staff) {
    insertStaff.run(...s);
  }

  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (id, title, content, is_pinned, valid_from, valid_to, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const announcements = [
    ['a1', '关于小区电梯年度检修的通知', '为保障电梯安全运行，本小区将于6月15日对所有电梯进行年度检修，届时1-3号楼电梯将暂停使用一天，请各位业主提前做好安排。', 1, '2026-06-01T00:00:00Z', '2026-06-20T23:59:59Z', '2026-06-01T10:00:00Z'],
    ['a2', '停水通知', '因市政管道维修，6月10日上午9:00-12:00，5-8号楼将暂停供水，请提前做好储水准备。', 1, '2026-06-08T00:00:00Z', '2026-06-11T23:59:59Z', '2026-06-08T09:00:00Z'],
    ['a3', '停电通知', '因线路升级改造，6月12日下午14:00-17:00，2号楼将暂停供电。', 0, '2026-06-10T00:00:00Z', '2026-06-13T23:59:59Z', '2026-06-07T14:00:00Z']
  ];

  for (const a of announcements) {
    insertAnnouncement.run(...a);
  }

  const insertOrder = db.prepare(`
    INSERT INTO work_orders (id, order_no, building, unit, room_no, repair_type, description, urgency, photo_urls, status, staff_id, owner_room, created_at, updated_at, assigned_at, completed_at, rating, rating_comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const orders = [
    ['o1', 'WO202605010001', '1号楼', '1单元', '101', 'water', '卫生间水龙头漏水', 'normal', '[]', 'completed', 's1', '1号楼1单元101', '2026-05-01T09:00:00Z', '2026-05-01T16:30:00Z', '2026-05-01T09:30:00Z', '2026-05-01T16:30:00Z', 5, '维修及时，师傅很专业'],
    ['o2', 'WO202605020002', '2号楼', '2单元', '302', 'electric', '客厅插座没电', 'urgent', '[]', 'completed', 's1', '2号楼2单元302', '2026-05-02T10:00:00Z', '2026-05-02T14:00:00Z', '2026-05-02T10:30:00Z', '2026-05-02T14:00:00Z', 4, '处理速度快，满意'],
    ['o3', 'WO202605030003', '3号楼', '1单元', '503', 'door_window', '入户门开关有异响', 'normal', '[]', 'completed', 's2', '3号楼1单元503', '2026-05-03T11:00:00Z', '2026-05-04T10:00:00Z', '2026-05-03T11:30:00Z', '2026-05-04T10:00:00Z', 5, '师傅很细心，问题解决了'],
    ['o4', 'WO202605050004', '1号楼', '3单元', '801', 'wall', '墙面有裂缝', 'normal', '[]', 'completed', 's3', '1号楼3单元801', '2026-05-05T14:00:00Z', '2026-05-06T15:00:00Z', '2026-05-05T14:30:00Z', '2026-05-06T15:00:00Z', 4, '修补效果还可以'],
    ['o5', 'WO202605070005', '5号楼', '1单元', '202', 'public', '楼道灯不亮', 'urgent', '[]', 'completed', 's1', '5号楼1单元202', '2026-05-07T19:00:00Z', '2026-05-07T20:30:00Z', '2026-05-07T19:15:00Z', '2026-05-07T20:30:00Z', 5, '晚上报修也能及时处理，点赞'],
    ['o6', 'WO202605100006', '6号楼', '2单元', '405', 'elevator', '电梯按钮失灵', 'very_urgent', '[]', 'completed', 's3', '6号楼2单元405', '2026-05-10T08:00:00Z', '2026-05-10T12:00:00Z', '2026-05-10T08:15:00Z', '2026-05-10T12:00:00Z', 5, '紧急情况处理很快'],
    ['o7', 'WO202605120007', '2号楼', '1单元', '1203', 'water', '热水器不出热水', 'normal', '[]', 'completed', 's1', '2号楼1单元1203', '2026-05-12T13:00:00Z', '2026-05-12T17:00:00Z', '2026-05-12T13:30:00Z', '2026-05-12T17:00:00Z', 4, '问题已解决'],
    ['o8', 'WO202605150008', '7号楼', '3单元', '601', 'electric', '空调插座接触不良', 'normal', '[]', 'completed', 's2', '7号楼3单元601', '2026-05-15T10:00:00Z', '2026-05-16T11:00:00Z', '2026-05-15T10:30:00Z', '2026-05-16T11:00:00Z', 5, '师傅服务态度很好'],
    ['o9', 'WO202605200009', '4号楼', '2单元', '904', 'wall', '墙纸脱落', 'normal', '[]', 'completed', 's3', '4号楼2单元904', '2026-05-20T09:00:00Z', '2026-05-21T16:00:00Z', '2026-05-20T09:30:00Z', '2026-05-21T16:00:00Z', 4, '整体满意'],
    ['o10', 'WO202605250010', '8号楼', '1单元', '302', 'other', '信箱损坏', 'normal', '[]', 'completed', 's2', '8号楼1单元302', '2026-05-25T15:00:00Z', '2026-05-26T10:00:00Z', '2026-05-25T15:30:00Z', '2026-05-26T10:00:00Z', 5, '非常满意'],
    ['o11', 'WO202606010011', '1号楼', '2单元', '403', 'water', '厨房下水管堵塞', 'urgent', '[]', 'repairing', 's1', '1号楼2单元403', '2026-06-01T09:00:00Z', '2026-06-01T10:30:00Z', '2026-06-01T09:30:00Z', null, null, null],
    ['o12', 'WO202606020012', '3号楼', '2单元', '702', 'door_window', '窗户密封条老化漏风', 'normal', '[]', 'repairing', 's2', '3号楼2单元702', '2026-06-02T10:00:00Z', '2026-06-03T09:00:00Z', '2026-06-02T14:00:00Z', null, null, null],
    ['o13', 'WO202606030013', '5号楼', '3单元', '1101', 'elevator', '电梯运行有异响', 'very_urgent', '[]', 'checking', 's3', '5号楼3单元1101', '2026-06-03T08:00:00Z', '2026-06-03T16:00:00Z', '2026-06-03T08:15:00Z', null, null, null],
    ['o14', 'WO202606040014', '2号楼', '3单元', '505', 'electric', '厨房照明跳闸', 'urgent', '[]', 'assigned', 's1', '2号楼3单元505', '2026-06-04T11:00:00Z', '2026-06-04T11:30:00Z', '2026-06-04T11:30:00Z', null, null, null],
    ['o15', 'WO202606050015', '6号楼', '1单元', '803', 'public', '健身区器材损坏', 'normal', '[]', 'assigned', 's2', '6号楼1单元803', '2026-06-05T14:00:00Z', '2026-06-05T14:30:00Z', '2026-06-05T14:30:00Z', null, null, null],
    ['o16', 'WO202606060016', '4号楼', '1单元', '201', 'water', '卫生间地漏反味', 'normal', '[]', 'pending', null, '4号楼1单元201', '2026-06-06T09:00:00Z', '2026-06-06T09:00:00Z', null, null, null, null],
    ['o17', 'WO202606070017', '7号楼', '2单元', '304', 'wall', '墙面渗水', 'urgent', '[]', 'pending', null, '7号楼2单元304', '2026-06-07T10:00:00Z', '2026-06-07T10:00:00Z', null, null, null, null],
    ['o18', 'WO202606080018', '8号楼', '3单元', '602', 'other', '门禁刷卡失灵', 'normal', '[]', 'pending', null, '8号楼3单元602', '2026-06-08T08:00:00Z', '2026-06-08T08:00:00Z', null, null, null, null],
    ['o19', 'WO202606060019', '1号楼', '1单元', '602', 'wall', '墙面发霉', 'urgent', '[]', 'rejected', 's3', '1号楼1单元602', '2026-06-06T13:00:00Z', '2026-06-07T16:00:00Z', '2026-06-06T13:30:00Z', null, null, null],
    ['o20', 'WO202606070020', '3号楼', '3单元', '105', 'water', '阳台漏水', 'very_urgent', '[]', 'rejected', 's1', '3号楼3单元105', '2026-06-07T07:00:00Z', '2026-06-08T09:00:00Z', '2026-06-07T07:15:00Z', null, null, null]
  ];

  for (const o of orders) {
    insertOrder.run(...o);
  }

  const insertStatusHistory = db.prepare(`
    INSERT INTO status_history (id, order_id, status, remark, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const statusHistory = [
    ['h1', 'o1', 'pending', '业主提交工单', '2026-05-01T09:00:00Z'],
    ['h2', 'o1', 'assigned', '分配给张师傅', '2026-05-01T09:30:00Z'],
    ['h3', 'o1', 'repairing', '开始维修', '2026-05-01T10:00:00Z'],
    ['h4', 'o1', 'checking', '维修完成申请验收', '2026-05-01T16:00:00Z'],
    ['h5', 'o1', 'completed', '业主验收通过', '2026-05-01T16:30:00Z'],
    ['h6', 'o11', 'pending', '业主提交工单', '2026-06-01T09:00:00Z'],
    ['h7', 'o11', 'assigned', '分配给张师傅', '2026-06-01T09:30:00Z'],
    ['h8', 'o11', 'repairing', '开始维修，已拆除旧管道', '2026-06-01T10:30:00Z'],
    ['h9', 'o13', 'pending', '业主提交工单', '2026-06-03T08:00:00Z'],
    ['h10', 'o13', 'assigned', '分配给王师傅', '2026-06-03T08:15:00Z'],
    ['h11', 'o13', 'repairing', '开始检修', '2026-06-03T09:00:00Z'],
    ['h12', 'o13', 'checking', '维修完成申请验收', '2026-06-03T16:00:00Z'],
    ['h13', 'o19', 'pending', '业主提交工单', '2026-06-06T13:00:00Z'],
    ['h14', 'o19', 'assigned', '分配给王师傅', '2026-06-06T13:30:00Z'],
    ['h15', 'o19', 'repairing', '开始维修', '2026-06-06T14:00:00Z'],
    ['h16', 'o19', 'checking', '维修完成申请验收', '2026-06-07T15:00:00Z'],
    ['h17', 'o19', 'rejected', '业主驳回：仍有霉斑', '2026-06-07T16:00:00Z']
  ];

  for (const h of statusHistory) {
    insertStatusHistory.run(...h);
  }

  const insertProgress = db.prepare(`
    INSERT INTO progress_updates (id, order_id, staff_id, content, photo_urls, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const progressUpdates = [
    ['p1', 'o11', 's1', '已到达现场，正在检查堵塞情况', '[]', '2026-06-01T10:00:00Z'],
    ['p2', 'o11', 's1', '已拆除旧管道，发现有大量油污堵塞，正在清理', '[]', '2026-06-01T11:00:00Z'],
    ['p3', 'o12', 's2', '已上门测量尺寸，明天带新密封条来更换', '[]', '2026-06-03T09:00:00Z'],
    ['p4', 'o13', 's3', '已检查电梯，发现曳引机轴承磨损，已更换', '[]', '2026-06-03T12:00:00Z'],
    ['p5', 'o13', 's3', '电梯试运行正常，异响已消除', '[]', '2026-06-03T15:30:00Z']
  ];

  for (const p of progressUpdates) {
    insertProgress.run(...p);
  }

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, user_type, type, title, content, order_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const notifications = [
    ['n1', 'admin', 'admin', 'timeout', '工单超时提醒', '工单WO202606060016已超过24小时未处理，请及时分配', 'o16', 0, '2026-06-07T09:00:00Z'],
    ['n2', 'admin', 'admin', 'timeout', '工单超时提醒', '工单WO202606070017已超过24小时未处理，请及时分配', 'o17', 0, '2026-06-08T10:00:00Z'],
    ['n3', 'W001', 'staff', 'new_order', '新工单分配', '您有新的工单需要处理：WO202606040014', 'o14', 0, '2026-06-04T11:30:00Z'],
    ['n4', 'W002', 'staff', 'new_order', '新工单分配', '您有新的工单需要处理：WO202606050015', 'o15', 0, '2026-06-05T14:30:00Z'],
    ['n5', '1号楼2单元403', 'owner', 'order_update', '工单进度更新', '您的工单WO202606010011维修进度已更新', 'o11', 0, '2026-06-01T11:00:00Z']
  ];

  for (const n of notifications) {
    insertNotification.run(...n);
  }
}

export function checkTimeout() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const pendingOrders = db.prepare(`
    SELECT id, order_no, created_at FROM work_orders 
    WHERE status = 'pending' AND created_at < ?
  `).all(twentyFourHoursAgo) as { id: string; order_no: string; created_at: string }[];

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, user_type, type, title, content, order_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const order of pendingOrders) {
    const exists = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE order_id = ? AND type = ?').get(order.id, 'timeout') as { count: number };
    if (exists.count === 0) {
      insertNotification.run(
        crypto.randomUUID(),
        'admin',
        'admin',
        'timeout',
        '工单超时提醒',
        `工单${order.order_no}已超过24小时未处理，请及时分配`,
        order.id,
        0,
        new Date().toISOString()
      );
    }
  }
}
