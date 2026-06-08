<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">工单管理</h2>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <el-form-item label="状态" class="mb-0">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待分配" value="pending" />
            <el-option label="已分配" value="assigned" />
            <el-option label="维修中" value="repairing" />
            <el-option label="待验收" value="checking" />
            <el-option label="已完成" value="completed" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" class="mb-0">
          <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 140px">
            <el-option label="水管" value="water" />
            <el-option label="电路" value="electric" />
            <el-option label="门窗" value="door_window" />
            <el-option label="墙面" value="wall" />
            <el-option label="公共设施" value="public" />
            <el-option label="电梯" value="elevator" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="loadOrders">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm">
      <el-table
        :data="orders"
        border
        stripe
        v-loading="loading"
        :row-class-name="rowClassName"
      >
        <el-table-column prop="orderNo" label="工单号" width="140" />
        <el-table-column label="房屋信息" width="140">
          <template #default="{ row }">
            {{ row.building }}-{{ row.unit }}-{{ row.roomNo }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getRepairTypeTagType(row.repairType)">
              {{ formatRepairType(row.repairType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="紧急程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getUrgencyTagType(row.urgency)">
              {{ formatUrgency(row.urgency) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="维修人员" width="100">
          <template #default="{ row }">
            {{ row.staff?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="超时" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isTimeout" type="danger" size="small">超时</el-tag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="SLA" width="180">
          <template #default="{ row }">
            <div v-if="row.sla" class="text-sm space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-gray-500 text-xs">响应:</span>
                <span :class="getSLAStatusClass(row.sla.responseStatus)">
                  {{ formatSLATime(row.sla.responseRemaining) }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500 text-xs">解决:</span>
                <span :class="getSLAStatusClass(row.sla.resolveStatus)">
                  {{ formatSLATime(row.sla.resolveRemaining) }}
                </span>
              </div>
            </div>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              @click="openAssignDialog(row)"
            >
              <el-icon><UserFilled /></el-icon>
              分配
            </el-button>
            <el-button size="small" @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end p-4">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </div>

    <el-dialog
      v-model="assignDialogVisible"
      title="分配维修人员"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-loading="recommendedLoading">
        <div class="mb-4 text-sm text-gray-600">
          工单类型：<el-tag>{{ currentOrder?.repairType ? formatRepairType(currentOrder.repairType) : '-' }}</el-tag>
        </div>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div
            v-for="staff in recommendedStaff"
            :key="staff.id"
            class="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
            :class="{ 'border-blue-500 bg-blue-50': selectedStaffId === staff.id }"
            @click="selectedStaffId = staff.id"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <el-icon :size="20" color="#3b82f6"><UserFilled /></el-icon>
              </div>
              <div>
                <div class="font-medium text-gray-800">{{ staff.name }}</div>
                <div class="text-xs text-gray-500">{{ staff.phone }}</div>
                <div class="flex flex-wrap gap-1 mt-1">
                  <el-tag
                    v-for="skill in staff.skills"
                    :key="skill"
                    size="small"
                    type="info"
                  >
                    {{ formatSkillTag(skill) }}
                  </el-tag>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm">
                <span class="text-gray-500">当前工单：</span>
                <span class="font-medium" :class="staff.currentOrderCount > 3 ? 'text-red-600' : 'text-green-600'">
                  {{ staff.currentOrderCount }} 单
                </span>
              </div>
              <div class="text-sm mt-1">
                <span class="text-gray-500">评分：</span>
                <span class="font-medium text-yellow-600">{{ staff.avgRating.toFixed(1) }}</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                匹配度：{{ staff.matchScore }}%
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedStaffId" :loading="assigning" @click="confirmAssign">
          确认分配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrders, assignOrder, getRecommendedStaff } from '@/api/orders'
import { formatDate, formatStatus, formatUrgency, formatRepairType, formatSkillTag, formatSLATime, getSLAStatusClass, isSLAWarning, isSLAOverdue } from '@/utils/format'
import type { WorkOrder, RepairType, OrderStatus, UrgencyLevel } from '@shared/types'
import { Search, UserFilled, View } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(false)
const orders = ref<WorkOrder[]>([])

const filterStatus = ref<OrderStatus | ''>('')
const filterType = ref<RepairType | ''>('')

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const assignDialogVisible = ref(false)
const recommendedLoading = ref(false)
const assigning = ref(false)
const currentOrder = ref<WorkOrder | null>(null)
const recommendedStaff = ref<any[]>([])
const selectedStaffId = ref('')

function rowClassName({ row }: { row: WorkOrder }) {
  if (isSLAOverdue(row.sla) || row.isTimeout) {
    return 'overdue-row'
  }
  if (isSLAWarning(row.sla)) {
    return 'warning-row'
  }
  return ''
}

function getStatusTagType(status: OrderStatus) {
  const typeMap: Record<OrderStatus, string> = {
    pending: 'warning',
    assigned: 'primary',
    repairing: 'info',
    checking: '',
    completed: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || ''
}

function getUrgencyTagType(urgency: UrgencyLevel) {
  const typeMap: Record<UrgencyLevel, string> = {
    normal: 'info',
    urgent: 'warning',
    very_urgent: 'danger'
  }
  return typeMap[urgency] || ''
}

function getRepairTypeTagType(type: RepairType) {
  const typeMap: Record<RepairType, string> = {
    water: 'primary',
    electric: 'danger',
    door_window: 'warning',
    wall: 'success',
    public: 'info',
    elevator: '',
    other: 'info'
  }
  return typeMap[type] || ''
}

async function loadOrders() {
  loading.value = true
  try {
    const params: { status?: string; page?: number; pageSize?: number } = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    const res = await getOrders(params)
    orders.value = res.data
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterStatus.value = ''
  filterType.value = ''
  pagination.page = 1
  loadOrders()
}

async function openAssignDialog(order: WorkOrder) {
  currentOrder.value = order
  selectedStaffId.value = ''
  assignDialogVisible.value = true
  recommendedLoading.value = true
  try {
    recommendedStaff.value = await getRecommendedStaff(order.repairType)
  } finally {
    recommendedLoading.value = false
  }
}

async function confirmAssign() {
  if (!currentOrder.value || !selectedStaffId.value) return

  assigning.value = true
  try {
    await assignOrder(currentOrder.value.id, selectedStaffId.value)
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
    loadOrders()
  } finally {
    assigning.value = false
  }
}

function viewDetail(row: WorkOrder) {
  router.push(`/admin/orders/${row.id}`)
}

onMounted(() => {
  loadOrders()
})
</script>

<style>
.overdue-row {
  background-color: #fef0f0 !important;
}
.overdue-row:hover > td {
  background-color: #fde2e2 !important;
}
.warning-row {
  background-color: #fffbeb !important;
}
.warning-row:hover > td {
  background-color: #fef3c7 !important;
}
</style>
