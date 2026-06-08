<template>
  <div v-loading="loading" class="space-y-4">
    <div class="bg-white rounded-2xl shadow-sm p-4" v-if="order">
      <div class="flex items-start justify-between mb-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-lg font-bold text-gray-800">{{ formatRepairType(order.repairType) }}</span>
            <span v-if="order.isTimeout" class="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">已超时</span>
          </div>
          <p class="text-xs text-gray-500">工单号：{{ order.orderNo }}</p>
        </div>
        <span :class="['status-tag', getStatusClass(order.status)]">{{ formatStatus(order.status) }}</span>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm mb-4">
        <div class="flex items-center gap-2 text-gray-600">
          <el-icon><Location /></el-icon>
          <span>{{ order.building }}{{ order.unit }}{{ order.roomNo }}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600">
          <el-icon><Clock /></el-icon>
          <span>{{ formatDate(order.createdAt, 'MM-DD HH:mm') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span :class="['status-tag', getUrgencyClass(order.urgency)]">{{ formatUrgency(order.urgency) }}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600" v-if="order.staff">
          <el-icon><User /></el-icon>
          <span>{{ order.staff.name }}</span>
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100">
        <h4 class="text-sm font-medium text-gray-700 mb-2">问题描述</h4>
        <p class="text-sm text-gray-600">{{ order.description }}</p>
      </div>

      <div v-if="order.photoUrls && order.photoUrls.length > 0" class="pt-4 border-t border-gray-100">
        <h4 class="text-sm font-medium text-gray-700 mb-2">照片</h4>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(url, index) in order.photoUrls"
            :key="index"
            class="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
            @click="previewImage(url)"
          >
            <img :src="url" class="w-full h-full object-cover" @error="handleImageError($event)" />
          </div>
        </div>
      </div>

      <div v-if="order.rating" class="pt-4 border-t border-gray-100">
        <h4 class="text-sm font-medium text-gray-700 mb-2">我的评价</h4>
        <div class="flex items-center gap-2 mb-1">
          <el-rate v-model="order.rating" disabled :max="5" />
          <span class="text-sm text-gray-600">{{ order.rating }} 星</span>
        </div>
        <p v-if="order.ratingComment" class="text-sm text-gray-600">{{ order.ratingComment }}</p>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm p-4" v-if="order && order.statusHistory.length > 0">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <el-icon><Timer /></el-icon>
        状态流转
      </h3>
      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in order.statusHistory"
          :key="item.id"
          :timestamp="formatDate(item.createdAt, 'YYYY-MM-DD HH:mm')"
          :type="getStatusTimelineType(item.status, index, order.statusHistory.length)"
        >
          <div class="font-medium text-gray-800">{{ formatStatus(item.status) }}</div>
          <p v-if="item.remark" class="text-sm text-gray-500 mt-1">{{ item.remark }}</p>
        </el-timeline-item>
      </el-timeline>
    </div>

    <div class="bg-white rounded-2xl shadow-sm p-4" v-if="order && order.progressUpdates.length > 0">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <el-icon><List /></el-icon>
        维修进度
      </h3>
      <div class="space-y-4">
        <div
          v-for="progress in order.progressUpdates"
          :key="progress.id"
          class="pb-4 border-b border-gray-50 last:border-0 last:pb-0"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <el-avatar :size="32" class="bg-blue-500">
                {{ order.staff?.name?.charAt(0) || '维' }}
              </el-avatar>
              <div>
                <p class="text-sm font-medium text-gray-800">{{ order.staff?.name || '维修人员' }}</p>
                <p class="text-xs text-gray-400">{{ formatDate(progress.createdAt, 'MM-DD HH:mm') }}</p>
              </div>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-2">{{ progress.content }}</p>
          <div v-if="progress.photoUrls && progress.photoUrls.length > 0" class="flex flex-wrap gap-2">
            <div
              v-for="(url, index) in progress.photoUrls"
              :key="index"
              class="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
              @click="previewImage(url)"
            >
              <img :src="url" class="w-full h-full object-cover" @error="handleImageError($event)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="order && order.status === 'checking'" class="bg-white rounded-2xl shadow-sm p-4">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <el-icon><CircleCheck /></el-icon>
        验收确认
      </h3>
      <p class="text-sm text-gray-600 mb-4">维修人员已完成维修，请确认维修结果</p>
      <div class="flex gap-3">
        <el-button type="success" size="large" class="flex-1" :loading="accepting" @click="showAcceptDialog = true">
          确认通过
        </el-button>
        <el-button type="danger" size="large" class="flex-1" :loading="rejecting" @click="showRejectDialog = true">
          驳回
        </el-button>
      </div>
    </div>

    <div v-if="order && order.status === 'completed' && !order.rating" class="bg-white rounded-2xl shadow-sm p-4">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <el-icon><Star /></el-icon>
        服务评价
      </h3>
      <p class="text-sm text-gray-600 mb-4">请对本次维修服务进行评价</p>
      <div class="mb-4">
        <label class="text-sm text-gray-700 mb-2 block">评分</label>
        <el-rate v-model="ratingForm.rating" :max="5" />
      </div>
      <div class="mb-4">
        <label class="text-sm text-gray-700 mb-2 block">评价内容</label>
        <el-input
          v-model="ratingForm.comment"
          type="textarea"
          :rows="3"
          placeholder="请输入您的评价..."
          maxlength="200"
          show-word-limit
        />
      </div>
      <el-button type="primary" size="large" class="w-full" :loading="submittingRating" @click="handleSubmitRating">
        提交评价
      </el-button>
    </div>

    <el-dialog v-model="showAcceptDialog" title="确认验收" width="90%" :close-on-click-modal="false">
      <p class="text-gray-600 mb-4">确认维修已完成且符合要求？</p>
      <template #footer>
        <el-button @click="showAcceptDialog = false">取消</el-button>
        <el-button type="success" :loading="accepting" @click="handleAccept">确认通过</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRejectDialog" title="驳回申请" width="90%" :close-on-click-modal="false">
      <div class="mb-4">
        <label class="text-sm text-gray-700 mb-2 block">驳回原因</label>
        <el-input
          v-model="rejectReason"
          type="textarea"
          :rows="3"
          placeholder="请输入驳回原因..."
          maxlength="200"
          show-word-limit
        />
      </div>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" :loading="rejecting" @click="handleReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <el-image-viewer
      v-if="showViewer"
      :url-list="[previewUrl]"
      :initial-index="0"
      @close="showViewer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Location, Clock, User, Timer, List, CircleCheck, Star
} from '@element-plus/icons-vue'
import { getOrder, acceptOrder, rateOrder } from '@/api/orders'
import { formatDate, formatStatus, formatUrgency, formatRepairType, getStatusClass, getUrgencyClass } from '@/utils/format'
import type { WorkOrder, OrderStatus } from '@shared/types'

const route = useRoute()
const loading = ref(false)
const accepting = ref(false)
const rejecting = ref(false)
const submittingRating = ref(false)
const order = ref<WorkOrder | null>(null)
const showAcceptDialog = ref(false)
const showRejectDialog = ref(false)
const rejectReason = ref('')
const showViewer = ref(false)
const previewUrl = ref('')

const ratingForm = reactive({
  rating: 5,
  comment: ''
})

async function loadOrder() {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  try {
    order.value = await getOrder(id)
  } finally {
    loading.value = false
  }
}

type TimelineType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

function getStatusTimelineType(status: OrderStatus, index: number, total: number): TimelineType {
  if (index === total - 1) {
    return 'primary'
  }
  const typeMap: Record<OrderStatus, TimelineType> = {
    pending: 'warning',
    assigned: 'info',
    repairing: 'primary',
    checking: 'danger',
    completed: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'primary'
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect fill="%23f3f4f6" width="80" height="80"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="12" text-anchor="middle" x="40" y="45"%3E图片加载失败%3C/text%3E%3C/svg%3E'
}

function previewImage(url: string) {
  previewUrl.value = url
  showViewer.value = true
}

async function handleAccept() {
  if (!order.value) return

  accepting.value = true
  try {
    await acceptOrder(order.value.id, true)
    ElMessage.success('验收通过')
    showAcceptDialog.value = false
    loadOrder()
  } finally {
    accepting.value = false
  }
}

async function handleReject() {
  if (!order.value || !rejectReason.value.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  rejecting.value = true
  try {
    await acceptOrder(order.value.id, false, rejectReason.value.trim())
    ElMessage.success('已驳回')
    showRejectDialog.value = false
    rejectReason.value = ''
    loadOrder()
  } finally {
    rejecting.value = false
  }
}

async function handleSubmitRating() {
  if (!order.value) return
  if (!ratingForm.rating) {
    ElMessage.warning('请选择评分')
    return
  }

  submittingRating.value = true
  try {
    await rateOrder(order.value.id, ratingForm.rating, ratingForm.comment.trim())
    ElMessage.success('评价提交成功')
    loadOrder()
  } finally {
    submittingRating.value = false
  }
}

onMounted(() => {
  loadOrder()
})
</script>
