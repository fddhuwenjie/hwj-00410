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
      response_deadline TEXT,
      resolve_deadline TEXT,
      first_response_at TEXT,
      resolved_at TEXT,
      material_cost REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS inspection_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      cycle TEXT NOT NULL,
      items TEXT NOT NULL,
      created_by TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspection_records (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      area TEXT NOT NULL,
      items_result TEXT NOT NULL,
      abnormal_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES inspection_plans(id),
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      safety_threshold INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS material_usages (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      material_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      staff_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id),
      FOREIGN KEY (material_id) REFERENCES materials(id),
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      order_id TEXT UNIQUE NOT NULL,
      order_no TEXT NOT NULL,
      owner_room TEXT NOT NULL,
      building TEXT NOT NULL,
      labor_cost REAL NOT NULL DEFAULT 0,
      material_cost REAL NOT NULL DEFAULT 0,
      visit_fee REAL NOT NULL DEFAULT 15,
      total_amount REAL NOT NULL DEFAULT 0,
      labor_detail TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid',
      paid_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS return_visits (
      id TEXT PRIMARY KEY,
      order_id TEXT UNIQUE NOT NULL,
      order_no TEXT NOT NULL,
      owner_room TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      quality_score INTEGER DEFAULT 0,
      attitude_score INTEGER DEFAULT 0,
      speed_score INTEGER DEFAULT 0,
      has_remaining_issue INTEGER DEFAULT 0,
      remaining_issue_desc TEXT,
      suggestion TEXT,
      scheduled_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id),
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT NOT NULL,
      view_count INTEGER DEFAULT 0,
      helpful_count INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS self_service_records (
      id TEXT PRIMARY KEY,
      owner_room TEXT NOT NULL,
      query_text TEXT NOT NULL,
      matched_article_id TEXT,
      matched_article_title TEXT,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (matched_article_id) REFERENCES knowledge_articles(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON work_orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_staff ON work_orders(staff_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON work_orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_urgency ON work_orders(urgency);
    CREATE INDEX IF NOT EXISTS idx_progress_order ON progress_updates(order_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type);
    CREATE INDEX IF NOT EXISTS idx_inspection_plans_active ON inspection_plans(is_active);
    CREATE INDEX IF NOT EXISTS idx_inspection_records_plan ON inspection_records(plan_id);
    CREATE INDEX IF NOT EXISTS idx_inspection_records_staff ON inspection_records(staff_id);
    CREATE INDEX IF NOT EXISTS idx_inspection_records_date ON inspection_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
    CREATE INDEX IF NOT EXISTS idx_material_usages_order ON material_usages(order_id);
    CREATE INDEX IF NOT EXISTS idx_material_usages_material ON material_usages(material_id);
    CREATE INDEX IF NOT EXISTS idx_material_usages_date ON material_usages(created_at);
    CREATE INDEX IF NOT EXISTS idx_bills_owner ON bills(owner_room);
    CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
    CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(created_at);
    CREATE INDEX IF NOT EXISTS idx_bills_building ON bills(building);
    CREATE INDEX IF NOT EXISTS idx_return_visits_status ON return_visits(status);
    CREATE INDEX IF NOT EXISTS idx_return_visits_staff ON return_visits(staff_id);
    CREATE INDEX IF NOT EXISTS idx_return_visits_scheduled ON return_visits(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_articles(category);
    CREATE INDEX IF NOT EXISTS idx_knowledge_views ON knowledge_articles(view_count);
    CREATE INDEX IF NOT EXISTS idx_self_service_owner ON self_service_records(owner_room);
    CREATE INDEX IF NOT EXISTS idx_self_service_date ON self_service_records(created_at);
  `);

  const orderCols = db.prepare("PRAGMA table_info(work_orders)").all() as { name: string }[];
  const staffCols = db.prepare("PRAGMA table_info(staff)").all() as { name: string }[];

  if (!orderCols.some(c => c.name === 'repair_start_time')) {
    db.exec('ALTER TABLE work_orders ADD COLUMN repair_start_time TEXT');
  }
  if (!staffCols.some(c => c.name === 'comprehensive_satisfaction')) {
    db.exec('ALTER TABLE staff ADD COLUMN comprehensive_satisfaction REAL DEFAULT 0');
  }
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

  const insertInspectionPlan = db.prepare(`
    INSERT INTO inspection_plans (id, name, area, cycle, items, created_by, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inspectionPlans = [
    ['ip1', '日常消防巡检', '1-4号楼公共区域', 'daily', '["消防栓","灭火器","烟雾报警器","应急照明","疏散通道"]', 'admin', 1, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['ip2', '电梯周检', '所有楼栋电梯', 'weekly', '["电梯运行声音","按钮功能","门开关","应急电话","平层精度"]', 'admin', 1, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['ip3', '公共照明巡检', '园区公共区域', 'weekly', '["路灯","楼道灯","地下车库灯","景观灯","应急出口灯"]', 'admin', 1, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['ip4', '绿化月度检查', '园区绿化区域', 'monthly', '["乔木生长","灌木修剪","草坪状况","病虫害","灌溉设施"]', 'admin', 1, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z']
  ];

  for (const p of inspectionPlans) {
    insertInspectionPlan.run(...p);
  }

  const insertInspectionRecord = db.prepare(`
    INSERT INTO inspection_records (id, plan_id, staff_id, area, items_result, abnormal_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const inspectionRecords = [
    ['ir1', 'ip1', 's1', '1-4号楼公共区域', '[{"item":"消防栓","status":"normal"},{"item":"灭火器","status":"normal"},{"item":"烟雾报警器","status":"normal"},{"item":"应急照明","status":"abnormal","remark":"3楼应急灯不亮"},{"item":"疏散通道","status":"normal"}]', 1, '2026-06-06T09:00:00Z'],
    ['ir2', 'ip1', 's1', '1-4号楼公共区域', '[{"item":"消防栓","status":"normal"},{"item":"灭火器","status":"normal"},{"item":"烟雾报警器","status":"normal"},{"item":"应急照明","status":"normal"},{"item":"疏散通道","status":"normal"}]', 0, '2026-06-07T09:00:00Z'],
    ['ir3', 'ip1', 's2', '1-4号楼公共区域', '[{"item":"消防栓","status":"normal"},{"item":"灭火器","status":"abnormal","remark":"2号楼灭火器压力不足"},{"item":"烟雾报警器","status":"normal"},{"item":"应急照明","status":"normal"},{"item":"疏散通道","status":"normal"}]', 1, '2026-06-08T09:00:00Z'],
    ['ir4', 'ip2', 's3', '所有楼栋电梯', '[{"item":"电梯运行声音","status":"normal"},{"item":"按钮功能","status":"normal"},{"item":"门开关","status":"normal"},{"item":"应急电话","status":"normal"},{"item":"平层精度","status":"normal"}]', 0, '2026-06-02T14:00:00Z']
  ];

  for (const r of inspectionRecords) {
    insertInspectionRecord.run(...r);
  }

  const insertMaterial = db.prepare(`
    INSERT INTO materials (id, name, category, unit, unit_price, stock_quantity, safety_threshold, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const materials = [
    ['m1', 'PVC水管', '管件', '米', 15.5, 50, 20, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m2', 'PPR热水管', '管件', '米', 28.0, 30, 15, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m3', '弯头90度', '管件', '个', 3.5, 100, 30, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m4', 'LED灯泡', '电料', '个', 12.0, 80, 25, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m5', '插座面板', '电料', '个', 25.0, 40, 15, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m6', '空气开关', '电料', '个', 45.0, 20, 10, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m7', '膨胀螺丝', '五金', '套', 1.5, 200, 50, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m8', '生料带', '五金', '卷', 2.0, 150, 40, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m9', '密封胶', '五金', '支', 18.0, 25, 10, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z'],
    ['m10', '水龙头阀芯', '管件', '个', 35.0, 5, 15, '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z']
  ];

  for (const m of materials) {
    insertMaterial.run(...m);
  }

  const insertMaterialUsage = db.prepare(`
    INSERT INTO material_usages (id, order_id, material_id, material_name, quantity, unit_price, total_price, staff_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const materialUsages = [
    ['mu1', 'o1', 'm8', '生料带', 2, 2.0, 4.0, 's1', '2026-05-01T10:00:00Z'],
    ['mu2', 'o2', 'm5', '插座面板', 1, 25.0, 25.0, 's1', '2026-05-02T11:00:00Z'],
    ['mu3', 'o4', 'm9', '密封胶', 2, 18.0, 36.0, 's3', '2026-05-05T15:00:00Z'],
    ['mu4', 'o5', 'm4', 'LED灯泡', 3, 12.0, 36.0, 's1', '2026-05-07T19:30:00Z'],
    ['mu5', 'o11', 'm2', 'PPR热水管', 2, 28.0, 56.0, 's1', '2026-06-01T11:00:00Z'],
    ['mu6', 'o11', 'm3', '弯头90度', 4, 3.5, 14.0, 's1', '2026-06-01T11:00:00Z'],
    ['mu7', 'o11', 'm8', '生料带', 1, 2.0, 2.0, 's1', '2026-06-01T11:00:00Z']
  ];

  for (const mu of materialUsages) {
    insertMaterialUsage.run(...mu);
  }

  db.prepare("UPDATE work_orders SET material_cost = 4.0 WHERE id = 'o1'").run();
  db.prepare("UPDATE work_orders SET material_cost = 25.0 WHERE id = 'o2'").run();
  db.prepare("UPDATE work_orders SET material_cost = 36.0 WHERE id = 'o4'").run();
  db.prepare("UPDATE work_orders SET material_cost = 36.0 WHERE id = 'o5'").run();
  db.prepare("UPDATE work_orders SET material_cost = 72.0 WHERE id = 'o11'").run();

  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-01T10:00:00Z' WHERE id = 'o1'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-02T11:00:00Z' WHERE id = 'o2'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-03T14:00:00Z' WHERE id = 'o3'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-05T15:00:00Z' WHERE id = 'o4'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-07T19:30:00Z' WHERE id = 'o5'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-10T09:00:00Z' WHERE id = 'o6'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-12T14:00:00Z' WHERE id = 'o7'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-15T11:00:00Z' WHERE id = 'o8'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-20T10:00:00Z' WHERE id = 'o9'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-05-25T16:00:00Z' WHERE id = 'o10'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-06-01T10:30:00Z' WHERE id = 'o11'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-06-03T09:00:00Z' WHERE id = 'o12'").run();
  db.prepare("UPDATE work_orders SET repair_start_time = '2026-06-03T09:00:00Z' WHERE id = 'o13'").run();

  const insertBill = db.prepare(`
    INSERT INTO bills (id, order_id, order_no, owner_room, building, labor_cost, material_cost, visit_fee, total_amount, labor_detail, status, paid_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const bills = [
    ['b1', 'o1', 'WO202605010001', '1号楼1单元101', '1号楼', 325, 4, 15, 344, '{"startTime":"2026-05-01T10:00:00Z","endTime":"2026-05-01T16:30:00Z","durationHours":6.5,"hourlyRate":50,"subtotal":325}', 'paid', '2026-05-02T10:00:00Z', '2026-05-01T16:30:00Z'],
    ['b2', 'o2', 'WO202605020002', '2号楼2单元302', '2号楼', 150, 25, 15, 190, '{"startTime":"2026-05-02T11:00:00Z","endTime":"2026-05-02T14:00:00Z","durationHours":3,"hourlyRate":50,"subtotal":150}', 'paid', '2026-05-03T09:00:00Z', '2026-05-02T14:00:00Z'],
    ['b3', 'o3', 'WO202605030003', '3号楼1单元503', '3号楼', 100, 0, 15, 115, '{"startTime":"2026-05-03T14:00:00Z","endTime":"2026-05-04T10:00:00Z","durationHours":2,"hourlyRate":50,"subtotal":100}', 'paid', '2026-05-05T14:00:00Z', '2026-05-04T10:00:00Z'],
    ['b4', 'o4', 'WO202605050004', '1号楼3单元801', '1号楼', 125, 36, 15, 176, '{"startTime":"2026-05-05T15:00:00Z","endTime":"2026-05-06T15:00:00Z","durationHours":2.5,"hourlyRate":50,"subtotal":125}', 'paid', '2026-05-07T10:00:00Z', '2026-05-06T15:00:00Z'],
    ['b5', 'o5', 'WO202605070005', '5号楼1单元202', '5号楼', 50, 36, 15, 101, '{"startTime":"2026-05-07T19:30:00Z","endTime":"2026-05-07T20:30:00Z","durationHours":1,"hourlyRate":50,"subtotal":50}', 'paid', '2026-05-08T09:00:00Z', '2026-05-07T20:30:00Z'],
    ['b6', 'o6', 'WO202605100006', '6号楼2单元405', '6号楼', 150, 0, 15, 165, '{"startTime":"2026-05-10T09:00:00Z","endTime":"2026-05-10T12:00:00Z","durationHours":3,"hourlyRate":50,"subtotal":150}', 'paid', '2026-05-11T10:00:00Z', '2026-05-10T12:00:00Z'],
    ['b7', 'o7', 'WO202605120007', '2号楼1单元1203', '2号楼', 150, 0, 15, 165, '{"startTime":"2026-05-12T14:00:00Z","endTime":"2026-05-12T17:00:00Z","durationHours":3,"hourlyRate":50,"subtotal":150}', 'unpaid', null, '2026-05-12T17:00:00Z'],
    ['b8', 'o8', 'WO202605150008', '7号楼3单元601', '7号楼', 125, 0, 15, 140, '{"startTime":"2026-05-15T11:00:00Z","endTime":"2026-05-16T11:00:00Z","durationHours":2.5,"hourlyRate":50,"subtotal":125}', 'unpaid', null, '2026-05-16T11:00:00Z'],
    ['b9', 'o9', 'WO202605200009', '4号楼2单元904', '4号楼', 150, 0, 15, 165, '{"startTime":"2026-05-20T10:00:00Z","endTime":"2026-05-21T16:00:00Z","durationHours":3,"hourlyRate":50,"subtotal":150}', 'unpaid', null, '2026-05-21T16:00:00Z'],
    ['b10', 'o10', 'WO202605250010', '8号楼1单元302', '8号楼', 75, 0, 15, 90, '{"startTime":"2026-05-25T16:00:00Z","endTime":"2026-05-26T10:00:00Z","durationHours":1.5,"hourlyRate":50,"subtotal":75}', 'unpaid', null, '2026-05-26T10:00:00Z']
  ];

  for (const b of bills) {
    insertBill.run(...b);
  }

  const insertReturnVisit = db.prepare(`
    INSERT INTO return_visits (id, order_id, order_no, owner_room, staff_id, staff_name, quality_score, attitude_score, speed_score, has_remaining_issue, remaining_issue_desc, suggestion, scheduled_at, completed_at, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const returnVisits = [
    ['rv1', 'o1', 'WO202605010001', '1号楼1单元101', 's1', '张师傅', 5, 5, 4, 0, null, '服务很好，师傅很专业', '2026-05-04T00:00:00Z', '2026-05-04T10:30:00Z', 'completed', '2026-05-01T16:30:00Z'],
    ['rv2', 'o2', 'WO202605020002', '2号楼2单元302', 's1', '张师傅', 4, 5, 5, 0, null, '响应速度很快', '2026-05-05T00:00:00Z', '2026-05-05T14:00:00Z', 'completed', '2026-05-02T14:00:00Z'],
    ['rv3', 'o3', 'WO202605030003', '3号楼1单元503', 's2', '李师傅', 5, 4, 4, 0, null, '整体满意', '2026-05-06T00:00:00Z', '2026-05-06T09:00:00Z', 'completed', '2026-05-04T10:00:00Z'],
    ['rv4', 'o4', 'WO202605050004', '1号楼3单元801', 's3', '王师傅', 4, 4, 3, 1, '还有一点小裂纹', '希望能更仔细一些', '2026-05-08T00:00:00Z', '2026-05-08T15:00:00Z', 'completed', '2026-05-06T15:00:00Z'],
    ['rv5', 'o5', 'WO202605070005', '5号楼1单元202', 's1', '张师傅', 5, 5, 5, 0, null, '晚上也能及时处理，点赞', '2026-05-10T00:00:00Z', '2026-05-10T10:00:00Z', 'completed', '2026-05-07T20:30:00Z'],
    ['rv6', 'o6', 'WO202605100006', '6号楼2单元405', 's3', '王师傅', 5, 5, 5, 0, null, '紧急情况处理到位', '2026-05-13T00:00:00Z', '2026-05-13T11:00:00Z', 'completed', '2026-05-10T12:00:00Z'],
    ['rv7', 'o7', 'WO202605120007', '2号楼1单元1203', 's1', '张师傅', 0, 0, 0, 0, null, null, '2026-05-15T00:00:00Z', null, 'pending', '2026-05-12T17:00:00Z'],
    ['rv8', 'o8', 'WO202605150008', '7号楼3单元601', 's2', '李师傅', 0, 0, 0, 0, null, null, '2026-05-18T00:00:00Z', null, 'pending', '2026-05-16T11:00:00Z'],
    ['rv9', 'o9', 'WO202605200009', '4号楼2单元904', 's3', '王师傅', 0, 0, 0, 0, null, null, '2026-05-23T00:00:00Z', null, 'pending', '2026-05-21T16:00:00Z'],
    ['rv10', 'o10', 'WO202605250010', '8号楼1单元302', 's2', '李师傅', 0, 0, 0, 0, null, null, '2026-05-28T00:00:00Z', null, 'pending', '2026-05-26T10:00:00Z']
  ];

  for (const rv of returnVisits) {
    insertReturnVisit.run(...rv);
  }

  const insertKnowledge = db.prepare(`
    INSERT INTO knowledge_articles (id, title, category, content, keywords, view_count, helpful_count, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const knowledgeArticles = [
    ['k1', '水龙头漏水的常见原因及简单处理方法', 'water', '# 水龙头漏水的常见原因及简单处理方法\n\n## 常见原因\n\n1. **阀芯老化** - 使用时间长了，阀芯密封圈磨损\n2. **接口松动** - 水龙头与水管连接处螺丝松动\n3. **水压过高** - 水压过大导致密封不严\n\n## 简单处理方法\n\n### 1. 阀芯更换\n- 关闭进水阀门\n- 用扳手拧开水龙头顶部\n- 取出旧阀芯，更换新的同型号阀芯\n\n### 2. 拧紧接口\n- 使用扳手适当拧紧连接螺帽\n- 注意不要用力过猛导致滑牙\n\n### 3. 调节水压\n- 可以在进水口安装减压阀\n\n> 如果以上方法无法解决问题，请提交工单安排专业维修人员上门处理。', '["水龙头","漏水","阀芯","水管","维修"]', 128, 45, 'admin', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'],
    ['k2', '电路跳闸的应急处理步骤', 'electric', '# 电路跳闸的应急处理步骤\n\n## 安全第一\n\n⚠️ 处理电路问题前，请确保双手干燥，最好戴上绝缘手套。\n\n## 步骤\n\n1. **切断所有电器电源**\n   - 拔掉所有正在使用的电器插头\n\n2. **找到配电箱**\n   - 通常位于入户门附近或厨房\n\n3. **检查断路器**\n   - 找到跳闸的断路器（开关位置在中间）\n   - 先将其完全推到"关"的位置\n   - 再推到"开"的位置\n\n4. **逐步恢复供电**\n   - 先插一个小功率电器测试\n   - 如果正常，再逐步恢复其他电器\n\n## 何时需要专业维修\n\n- 多次重复跳闸\n- 开关有焦黑痕迹\n- 有明显焦糊味\n- 断路器推不上去\n\n遇到以上情况，请立即提交工单。', '["跳闸","电路","断电","断路器","配电箱"]', 96, 38, 'admin', '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'],
    ['k3', '门窗密封条老化的判断与临时处理', 'door_window', '# 门窗密封条老化的判断与临时处理\n\n## 判断方法\n\n1. **观察外观**\n   - 密封条是否有裂纹、变形\n   - 是否变硬、失去弹性\n\n2. **手感检查**\n   - 用手按压，看是否能快速回弹\n   - 是否有粘手或掉渣现象\n\n3. **使用感受**\n   - 开关门窗时是否有异响\n   - 是否感觉漏风\n   - 下雨天是否渗水\n\n## 临时处理方法\n\n### 1. 清洁保养\n- 用温水加少量清洁剂擦拭\n- 晾干后涂抹少量滑石粉\n\n### 2. 临时密封\n- 漏风处可用胶带临时粘贴\n- 冬季可贴密封条\n\n## 专业更换\n\n如果密封条严重老化，建议提交工单更换全新密封条。', '["密封条","门窗","漏风","老化","更换"]', 72, 28, 'admin', '2026-05-03T00:00:00Z', '2026-05-03T00:00:00Z'],
    ['k4', '楼道灯不亮的排查方法', 'public', '# 楼道灯不亮的排查方法\n\n## 常见原因\n\n1. 灯泡烧坏\n2. 开关故障\n3. 线路问题\n4. 整栋楼停电\n\n## 排查步骤\n\n1. **检查其他楼层**\n   - 看看其他楼层的灯是否正常\n   - 如果都不亮，可能是公共线路问题\n\n2. **检查开关**\n   - 多次按动开关，听是否有正常的"咔哒"声\n\n3. **观察灯泡**\n   - 看灯丝是否断裂\n   - 灯泡是否发黑\n\n## 处理建议\n\n- 如果是单个灯泡问题，可联系物业更换\n- 如果是多个灯不亮或整栋楼问题，请提交紧急工单\n\n> 注意：公共照明属于物业负责范围，请勿自行拆卸维修，以免发生危险。', '["楼道灯","公共照明","灯泡","开关","线路"]', 85, 32, 'admin', '2026-05-04T00:00:00Z', '2026-05-04T00:00:00Z'],
    ['k5', '空调插座接触不良的解决办法', 'electric', '# 空调插座接触不良的解决办法\n\n## 症状\n\n1. 空调时开时关\n2. 插头有火花\n3. 插头发热严重\n4. 显示"电源故障"提示\n\n## 紧急处理\n\n⚠️ 如果发现插头发热严重或有火花，请立即拔掉插头，停止使用！\n\n## 检查步骤\n\n1. **检查插头**\n   - 插头插片是否变形、氧化\n   - 用砂纸轻轻打磨氧化层\n\n2. **检查插座**\n   - 插座内部是否有焦黑痕迹\n   - 插孔是否松动\n\n3. **测试其他电器**\n   - 用其他电器测试该插座\n   - 看看是否也有同样问题\n\n## 安全提示\n\n- 不要用湿手插拔插头\n- 发现问题及时报修，不要凑合使用\n- 空调属于大功率电器，建议使用专用插座', '["空调","插座","接触不良","插头","电源"]', 65, 22, 'admin', '2026-05-05T00:00:00Z', '2026-05-05T00:00:00Z'],
    ['k6', '卫生间地漏反味的原因及处理', 'water', '# 卫生间地漏反味的原因及处理\n\n## 常见原因\n\n1. **水封干涸** - 最常见原因\n2. **地漏故障** - 防臭装置损坏\n3. **管道问题** - 排水管堵塞或破裂\n\n## 处理方法\n\n### 1. 补水法（最简单）\n- 每天往地漏倒一杯水\n- 保持水封水位，防止异味上返\n\n### 2. 清洁地漏\n- 取出地漏盖板\n- 清理滤网中的毛发和杂物\n- 用热水冲洗\n\n### 3. 更换防臭地漏\n- 如果地漏老旧，建议更换\n- 选择带水封或硅胶芯的防臭地漏\n\n## 预防措施\n\n- 定期（每周）往地漏倒水\n- 安装地漏滤网，防止毛发进入\n- 不要将油污倒入地漏', '["地漏","反味","卫生间","下水管道","堵塞"]', 156, 68, 'admin', '2026-05-06T00:00:00Z', '2026-05-06T00:00:00Z']
  ];

  for (const ka of knowledgeArticles) {
    insertKnowledge.run(...ka);
  }

  const insertSelfService = db.prepare(`
    INSERT INTO self_service_records (id, owner_room, query_text, matched_article_id, matched_article_title, is_resolved, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const selfServiceRecords = [
    ['ssr1', '1号楼1单元101', '水龙头漏水', 'k1', '水龙头漏水的常见原因及简单处理方法', 1, '2026-05-02T09:00:00Z'],
    ['ssr2', '2号楼2单元302', '跳闸了怎么办', 'k2', '电路跳闸的应急处理步骤', 1, '2026-05-03T14:00:00Z'],
    ['ssr3', '3号楼1单元503', '窗户漏风', 'k3', '门窗密封条老化的判断与临时处理', 0, '2026-05-04T10:00:00Z'],
    ['ssr4', '5号楼1单元202', '楼道灯不亮', 'k4', '楼道灯不亮的排查方法', 1, '2026-05-05T19:00:00Z'],
    ['ssr5', '1号楼2单元403', '地漏有味', 'k6', '卫生间地漏反味的原因及处理', 1, '2026-05-06T08:00:00Z'],
    ['ssr6', '2号楼3单元505', '空调插不进去', 'k5', '空调插座接触不良的解决办法', 0, '2026-05-07T15:00:00Z'],
    ['ssr7', '4号楼2单元904', '厕所反味', 'k6', '卫生间地漏反味的原因及处理', 1, '2026-05-08T11:00:00Z'],
    ['ssr8', '6号楼2单元405', '灯泡坏了', 'k4', '楼道灯不亮的排查方法', 0, '2026-05-09T20:00:00Z']
  ];

  for (const ssr of selfServiceRecords) {
    insertSelfService.run(...ssr);
  }

  db.prepare("UPDATE staff SET comprehensive_satisfaction = 4.7 WHERE id = 's1'").run();
  db.prepare("UPDATE staff SET comprehensive_satisfaction = 4.3 WHERE id = 's2'").run();
  db.prepare("UPDATE staff SET comprehensive_satisfaction = 4.5 WHERE id = 's3'").run();
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
