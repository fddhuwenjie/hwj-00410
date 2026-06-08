import { Router } from 'express';
import { db } from '../db';
import { mapStaffRow } from '../utils';
import type { LoginRequest, LoginResponse } from '@shared/types';

const router = Router();

router.post('/login', (req, res) => {
  const { role, username, password, building, unit, roomNo } = req.body as LoginRequest;

  if (role === 'admin') {
    if (username === 'admin' && password === '123456') {
      return res.json({
        success: true,
        user: {
          id: 'admin',
          role: 'admin',
          name: '管理员'
        }
      } as LoginResponse);
    }
    return res.json({ success: false, error: '用户名或密码错误' });
  }

  if (role === 'staff') {
    const staffRow = db.prepare('SELECT * FROM staff WHERE work_no = ?').get(username) as any;
    if (staffRow && (password === '123456' || password === staffRow.password)) {
      const staff = mapStaffRow(staffRow);
      return res.json({
        success: true,
        user: {
          id: staff.id,
          role: 'staff',
          name: staff.name,
          workNo: staff.workNo
        }
      } as LoginResponse);
    }
    return res.json({ success: false, error: '工号或密码错误' });
  }

  if (role === 'owner') {
    if (building && unit && roomNo) {
      const room = `${building}${unit}${roomNo}`;
      return res.json({
        success: true,
        user: {
          id: room,
          role: 'owner',
          name: `${building}${unit}${roomNo}业主`,
          room
        }
      } as LoginResponse);
    }
    return res.json({ success: false, error: '请选择完整的房号信息' });
  }

  return res.json({ success: false, error: '无效的角色类型' });
});

export default router;
