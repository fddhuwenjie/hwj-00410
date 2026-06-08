<template>
  <div class="space-y-4">
    <el-tabs v-model="activeTab" class="order-tabs">
      <el-tab-pane label="待处理" name="assigned">
        <span v-if="counts.assigned > 0" class="tab-badge">{{ counts.assigned }}</span>
      </el-tab-pane>
      <el-tab-pane label="维修中" name="repairing">
        <span v-if="counts.repairing > 0" class="tab-badge">{{ counts.repairing }}</span>
      </el-tab-pane>
      <el-tab-pane label="已完成" name="completed">
        <span v-if="counts.completed > 0" class="tab-badge">{{ counts.completed }}</span>
      </el-tab-pane>
    </el-tabs>

    <div v-loading="loading" class="space-y-3">
      <div v-if="orders.length === 0" class="text-center py-16">
        <el-empty description="暂无工单" />
      </div>

      <div
        v-for="order in orders"
        :key="order.id"
        class="order-card"
        :class="{ 'timeout-card': order.isTimeout }"
        @click="goToDetail(order.id)"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="order-no">{{ order.orderNo }}</span>
            <el-tag
              :type="getUrgencyTagType(order.urgency)"
              size="small"
              effect="light"
            >
              {{ formatUrgency(order.urgency) }}
            </el-tag>
            <el-tag v-if="order.isTimeout" type="danger" size="small" effect="dark">
              超时
            </el-tag>
          </div>
          <span class="text-xs text-gray-400">{{ formatDate(order.createdAt, 'MM-DD HH:mm') }}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="info-item">
            <span class="info-label">房号</span>
            <span class="info-value">{{ order.building }}{{ order.unit }}{{ order.roomNo }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">类型</span>
            <span class="info-value">{{ formatRepairType(order.repairType) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 line-clamp-1">{{ order.description }}</span>
          <el-icon class="text-gray-400"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { getOrders } from '@/api/orders'
import { useUserStore } from '@/stores/user'
import { formatDate, formatUrgency, formatRepairType } from '@/utils/format'
import type { WorkOrder, UrgencyLevel } from '@shared/types'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref<'assigned' | 'repairing' | 'completed'>('assigned')
const loading = ref(false)
const orders = ref<WorkOrder[]>([])
const allOrders = ref<WorkOrder[]>([])

const counts = computed(() => ({
  assigned: allOrders.value.filter(o => o.status === 'assigned').length,
  repairing: allOrders.value.filter(o => o.status === 'repairing').length,
  completed: allOrders.value.filter(o => o.status === 'completed' || o.status === 'checking').length
}))

function getUrgencyTagType(urgency: UrgencyLevel) {
  const map: Record<UrgencyLevel, string> = {
    normal: 'info',
    urgent: 'warning',
    very_urgent: 'danger'
  }
  return map[urgency]
}

async function fetchOrders() {
  if (!userStore.user?.id) return
  loading.value = true
  try {
    const response = await getOrders({
      staffId: userStore.user.id
    })
    allOrders.value = response.data
    filterOrders()
  } finally {
    loading.value = false
  }
}

function filterOrders() {
  const statusMap: Record<string, string[]> = {
    assigned: ['assigned'],
    repairing: ['repairing'],
    completed: ['completed', 'checking']
  }
  const statuses = statusMap[activeTab.value]
  orders.value = allOrders.value.filter(o => statuses.includes(o.status))
}

function goToDetail(id: string) {
  router.push(`/staff/orders/${id}`)
}

watch(activeTab, filterOrders)

onMounted(fetchOrders)
</script>

<style scoped>
.order-tabs :deep(.el-tabs__nav) {
  width: 100%;
}

.order-tabs :deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
  position: relative;
}

.tab-badge {
  position: absolute;
  top: 8px;
  right: 16%;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  color: #fff;
  background: #f56c6c;
  border-radius: 9px;
}

.order-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e7eb;
}

.order-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.timeout-card {
  border-color: #fecaca;
  background: linear-gradient(to right, #fef2f2, #ffffff);
}

.order-no {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
