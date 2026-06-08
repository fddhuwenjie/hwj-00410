<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center gap-3 mb-6">
      <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
      <h2 class="text-2xl font-bold text-gray-800">工单详情</h2>
    </div>

    <div v-loading="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-xl shadow-sm p-6">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-800">{{ order?.orderNo }}</h3>
              <p class="text-sm text-gray-500 mt-1">
                创建时间：{{ order?.createdAt ? formatDate(order.createdAt) : '-' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <el-tag v-if="order?.isTimeout" type="danger" size="small">超时</el-tag>
              <el-tag :type="getStatusTagType(order?.status)" size="large">
                {{ order?.status ? formatStatus(order.status) : '-' }}
              </el-tag>
            </div>
          </div>

          <div v-if="order?.sla" class="mb-6 p-4 rounded-lg" :class="getSLABackgroundClass(order.sla)">
            <h4 class="text-sm font-medium text-gray-700 mb-3">SLA时效</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 bg-white rounded-lg">
                <div class="text-xs text-gray-500 mb-1">响应截止时间</div>
                <div class="font-medium text-sm mb-2">
                  {{ formatDate(order.sla.responseDeadline, 'MM-DD HH:mm') }}
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">剩余时间</span>
                  <span
                    class="font-bold"
                    :class="getSLAStatusClass(order.sla.responseStatus)"
                  >
                    {{ formatSLATime(order.sla.responseRemaining) }}
                  </span>
                </div>
              </div>
              <div class="p-3 bg-white rounded-lg">
                <div class="text-xs text-gray-500 mb-1">解决截止时间</div>
                <div class="font-medium text-sm mb-2">
                  {{ formatDate(order.sla.resolveDeadline, 'MM-DD HH:mm') }}
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">剩余时间</span>
                  <span
                    class="font-bold"
                    :class="getSLAStatusClass(order.sla.resolveStatus)"
                  >
                    {{ formatSLATime(order.sla.resolveRemaining) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <el-icon :size="20" color="#6b7280"><Location /></el-icon>
              <div>
                <p class="text-xs text-gray-500">房屋信息</p>
                <p class="font-medium">{{ order?.building }}-{{ order?.unit }}-{{ order?.roomNo }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <el-icon :size="20" color="#6b7280"><Tools /></el-icon>
              <div>
                <p class="text-xs text-gray-500">维修类型</p>
                <p class="font-medium">{{ order?.repairType ? formatRepairType(order.repairType) : '-' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <el-icon :size="20" color="#6b7280"><Warning /></el-icon>
              <div>
                <p class="text-xs text-gray-500">紧急程度</p>
                <p class="font-medium">
                  <el-tag :type="getUrgencyTagType(order?.urgency)" size="small">
                    {{ order?.urgency ? formatUrgency(order.urgency) : '-' }}
                  </el-tag>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <el-icon :size="20" color="#6b7280"><UserFilled /></el-icon>
              <div>
                <p class="text-xs text-gray-500">维修人员</p>
                <p class="font-medium">{{ order?.staff?.name || '未分配' }}</p>
              </div>
            </div>
          </div>

          <div class="mb-6">
            <h4 class="text-sm font-medium text-gray-700 mb-2">问题描述</h4>
            <p class="text-gray-600 bg-gray-50 p-4 rounded-lg">{{ order?.description }}</p>
          </div>

          <div v-if="order?.photoUrls && order.photoUrls.length > 0" class="mb-6">
            <h4 class="text-sm font-medium text-gray-700 mb-2">现场照片</h4>
            <div class="flex flex-wrap gap-3">
              <img
                v-for="(url, index) in order.photoUrls"
                :key="index"
                :src="url"
                class="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                @click="previewImage(url)"
              />
            </div>
          </div>

          <div v-if="order?.rating" class="mb-6">
            <h4 class="text-sm font-medium text-gray-700 mb-2">评价</h4>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <el-rate v-model="order.rating" disabled :max="5" />
                <span class="text-sm text-gray-500">{{ order.rating }} 分</span>
              </div>
              <p class="text-gray-600">{{ order.ratingComment }}</p>
            </div>
          </div>

          <div v-if="order?.materialCost && order.materialCost > 0" class="mb-6">
            <h4 class="text-sm font-medium text-gray-700 mb-2">物料费用</h4>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <span class="text-gray-600">物料总费用</span>
                <span class="text-xl font-bold text-red-600">¥{{ order.materialCost.toFixed(2) }}</span>
              </div>
              <el-table v-if="order.materialUsages && order.materialUsages.length > 0" :data="order.materialUsages" size="small">
                <el-table-column prop="material.name" label="物料名称" />
                <el-table-column prop="material.unit" label="单位" width="60" />
                <el-table-column prop="quantity" label="数量" width="80" align="center" />
                <el-table-column label="单价" width="100" align="center">
                  <template #default="{ row }">
                    ¥{{ row.unitPrice.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column label="小计" width="100" align="center">
                  <template #default="{ row }">
                    ¥{{ (row.quantity * row.unitPrice).toFixed(2) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">维修进度</h3>
          <div v-if="order?.progressUpdates && order.progressUpdates.length > 0" class="space-y-4">
            <div
              v-for="progress in order.progressUpdates"
              :key="progress.id"
              class="flex gap-4"
            >
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <el-icon :size="18" color="#3b82f6"><Setting /></el-icon>
                </div>
                <div class="w-0.5 flex-1 bg-gray-200 mt-2"></div>
              </div>
              <div class="flex-1 pb-6">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-800">{{ progress.content }}</span>
                  <span class="text-xs text-gray-400">{{ formatDate(progress.createdAt) }}</span>
                </div>
                <div v-if="progress.photoUrls && progress.photoUrls.length > 0" class="flex flex-wrap gap-2 mt-2">
                  <img
                    v-for="(url, index) in progress.photoUrls"
                    :key="index"
                    :src="url"
                    class="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                    @click="previewImage(url)"
                  />
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无维修进度" />
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">状态流转</h3>
          <el-timeline>
            <el-timeline-item
              v-for="(history, index) in reversedStatusHistory"
              :key="history.id"
              :timestamp="formatDate(history.createdAt)"
              :type="getStatusTimelineType(history.status)"
              :hollow="index === 0"
            >
              <div class="font-medium">{{ formatStatus(history.status) }}</div>
              <div v-if="history.remark" class="text-sm text-gray-500 mt-1">
                {{ history.remark }}
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <div v-if="order?.staff" class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">维修人员信息</h3>
          <div class="flex items-center gap-4 mb-4">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <el-icon :size="32" color="#3b82f6"><UserFilled /></el-icon>
            </div>
            <div>
              <p class="font-semibold text-gray-800">{{ order.staff.name }}</p>
              <p class="text-sm text-gray-500">工号：{{ order.staff.workNo }}</p>
              <p class="text-sm text-gray-500">手机：{{ order.staff.phone }}</p>
            </div>
          </div>
          <div class="border-t pt-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-500">平均评分</span>
              <div class="flex items-center gap-1">
                <el-rate v-model="order.staff.avgRating" disabled :max="5" size="small" />
                <span class="text-sm">{{ order.staff.avgRating.toFixed(1) }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-500">当前工单</span>
              <span class="font-medium">{{ order.staff.currentOrderCount }} 单</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">历史完成</span>
              <span class="font-medium">{{ order.staff.completedOrderCount }} 单</span>
            </div>
          </div>
          <div class="border-t mt-4 pt-4">
            <p class="text-sm text-gray-500 mb-2">技能标签</p>
            <div class="flex flex-wrap gap-2">
              <el-tag
                v-for="skill in order.staff.skills"
                :key="skill"
                size="small"
                type="info"
              >
                {{ formatSkillTag(skill) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-image-viewer
      v-if="previewVisible"
      :url-list="[previewUrl]"
      :initial-index="0"
      @close="previewVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrder } from '@/api/orders'
import { formatDate, formatStatus, formatUrgency, formatRepairType, formatSkillTag, formatSLATime, getSLAStatusClass, isSLAWarning, isSLAOverdue } from '@/utils/format'
import type { WorkOrder, OrderStatus, UrgencyLevel, SLAInfo } from '@shared/types'
import { ArrowLeft, Location, Tools, Warning, UserFilled, Setting } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const order = ref<WorkOrder | null>(null)
const previewVisible = ref(false)
const previewUrl = ref('')

const reversedStatusHistory = computed(() => {
  if (!order.value?.statusHistory) return []
  return [...order.value.statusHistory].reverse()
})

function getStatusTagType(status?: OrderStatus) {
  if (!status) return ''
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

function getUrgencyTagType(urgency?: UrgencyLevel) {
  if (!urgency) return ''
  const typeMap: Record<UrgencyLevel, string> = {
    normal: 'info',
    urgent: 'warning',
    very_urgent: 'danger'
  }
  return typeMap[urgency] || ''
}

function getStatusTimelineType(status?: OrderStatus) {
  if (!status) return ''
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

function getSLABackgroundClass(sla: SLAInfo): string {
  if (isSLAOverdue(sla)) {
    return 'bg-red-50'
  }
  if (isSLAWarning(sla)) {
    return 'bg-yellow-50'
  }
  return 'bg-green-50'
}

function goBack() {
  router.back()
}

function previewImage(url: string) {
  previewUrl.value = url
  previewVisible.value = true
}

async function loadOrderDetail() {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  try {
    order.value = await getOrder(id)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrderDetail()
})
</script>
