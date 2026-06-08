export type OrderStatus = 'pending' | 'assigned' | 'repairing' | 'checking' | 'completed' | 'rejected';

export type RepairType = 'water' | 'electric' | 'door_window' | 'wall' | 'public' | 'elevator' | 'other';

export type UrgencyLevel = 'normal' | 'urgent' | 'very_urgent';

export type SkillTag = 'water_electric' | 'carpentry' | 'tiler' | 'general';

export type UserRole = 'owner' | 'admin' | 'staff';

export type InspectionCycle = 'daily' | 'weekly' | 'monthly';

export type MaterialCategory = '管件' | '电料' | '五金';

export interface SLAInfo {
  responseDeadline: string;
  resolveDeadline: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  responseRemaining: number;
  resolveRemaining: number;
  responseStatus: 'normal' | 'warning' | 'overdue';
  resolveStatus: 'normal' | 'warning' | 'overdue';
}

export interface ProgressUpdate {
  id: string;
  orderId: string;
  staffId: string;
  content: string;
  photoUrls: string[];
  createdAt: string;
}

export interface StatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  remark?: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  orderNo: string;
  building: string;
  unit: string;
  roomNo: string;
  repairType: RepairType;
  description: string;
  urgency: UrgencyLevel;
  photoUrls: string[];
  status: OrderStatus;
  staffId?: string;
  staff?: Staff;
  ownerRoom: string;
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  completedAt?: string;
  rating?: number;
  ratingComment?: string;
  isTimeout: boolean;
  sla?: SLAInfo;
  materialCost: number;
  materialUsages: MaterialUsage[];
  progressUpdates: ProgressUpdate[];
  statusHistory: StatusHistory[];
}

export interface Staff {
  id: string;
  name: string;
  phone: string;
  skills: SkillTag[];
  workNo: string;
  currentOrderCount: number;
  completedOrderCount: number;
  avgRating: number;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  validFrom: string;
  validTo: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  userType: UserRole;
  type: 'order_update' | 'new_order' | 'timeout' | 'announcement';
  title: string;
  content: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface InspectionPlan {
  id: string;
  name: string;
  area: string;
  cycle: InspectionCycle;
  items: string[];
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionItemResult {
  item: string;
  status: 'normal' | 'abnormal';
  remark?: string;
}

export interface InspectionRecord {
  id: string;
  planId: string;
  plan?: InspectionPlan;
  staffId: string;
  staff?: Staff;
  area: string;
  itemsResult: InspectionItemResult[];
  abnormalCount: number;
  createdAt: string;
}

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  unitPrice: number;
  stockQuantity: number;
  safetyThreshold: number;
  createdAt: string;
  updatedAt: string;
  lowStock?: boolean;
}

export interface MaterialUsage {
  id: string;
  orderId: string;
  materialId: string;
  materialName: string;
  material: Material;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  staffId: string;
  createdAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  timeoutCount: number;
  timeoutRate: number;
  avgProcessingTime: number;
  inspectionCompletionRate: number;
  abnormalDetectionRate: number;
  lowStockCount: number;
  slaResponseRate: Record<UrgencyLevel, number>;
  slaResolveRate: Record<UrgencyLevel, number>;
}

export interface SLAStats {
  urgency: UrgencyLevel;
  total: number;
  responseOnTime: number;
  resolveOnTime: number;
  responseRate: number;
  resolveRate: number;
}

export interface MonthlyMaterialStats {
  category: MaterialCategory;
  month: string;
  quantity: number;
  amount: number;
}

export interface LoginRequest {
  role: UserRole;
  username: string;
  password: string;
  building?: string;
  unit?: string;
  roomNo?: string;
}

export interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    role: UserRole;
    name: string;
    room?: string;
    workNo?: string;
  };
}

export interface BuildingData {
  building: string;
  units: {
    unit: string;
    rooms: string[];
  }[];
}

export const RepairTypeMap: Record<RepairType, string> = {
  water: '水管',
  electric: '电路',
  door_window: '门窗',
  wall: '墙面',
  public: '公共设施',
  elevator: '电梯',
  other: '其他'
};

export const OrderStatusMap: Record<OrderStatus, string> = {
  pending: '待分配',
  assigned: '已分配',
  repairing: '维修中',
  checking: '待验收',
  completed: '已完成',
  rejected: '已驳回'
};

export const UrgencyLevelMap: Record<UrgencyLevel, string> = {
  normal: '一般',
  urgent: '紧急',
  very_urgent: '非常紧急'
};

export const SkillTagMap: Record<SkillTag, string> = {
  water_electric: '水电',
  carpentry: '木工',
  tiler: '瓦工',
  general: '综合'
};

export const RepairTypeToSkill: Record<RepairType, SkillTag[]> = {
  water: ['water_electric', 'general'],
  electric: ['water_electric', 'general'],
  door_window: ['carpentry', 'general'],
  wall: ['tiler', 'general'],
  public: ['general'],
  elevator: ['water_electric', 'general'],
  other: ['general']
};

export const InspectionCycleMap: Record<InspectionCycle, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月'
};

export const SLATimeLimits: Record<UrgencyLevel, { response: number; resolve: number }> = {
  normal: { response: 24, resolve: 72 },
  urgent: { response: 4, resolve: 24 },
  very_urgent: { response: 1, resolve: 4 }
};

export const MaterialCategoryList: MaterialCategory[] = ['管件', '电料', '五金'];
