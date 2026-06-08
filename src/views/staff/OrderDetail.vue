<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-2">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>

    <div v-loading="loading">
      <div v-if="order" class="space-y-4">
        <div class="bg-white rounded-xl p-4 shadow-sm" :class="{ 'timeout-border': order.isTimeout }">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg font-bold text-gray-800">{{ order.orderNo }}</span>
                <el-tag v-if="order.isTimeout" type="danger" size="small" effect="dark">
                  超时
                </el-tag>
              </div>
              <el-tag :type="getStatusTagType(order.status)" size="small" effect="light">
                {{ formatStatus(order.status) }}
              </el-tag>
            </div>
            <el-tag :type="getUrgencyTagType(order.urgency)" size="small">
              {{ formatUrgency(order.urgency) }}
            </el-tag>
          </div>

          <div class="grid grid-cols-2 gap-4 py-3 border-t border-gray-100">
            <div class="info-item">
              <span class="info-label">房号</span>
              <span class="info-value">{{ order.building }}{{ order.unit }}{{ order.roomNo }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">报修类型</span>
              <span class="info-value">{{ formatRepairType(order.repairType) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">提交时间</span>
              <span class="info-value">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">业主房号</span>
              <span class="info-value">{{ order.ownerRoom }}</span>
            </div>
          </div>

          <div class="pt-3 border-t border-gray-100">
            <div class="info-label mb-2">问题描述</div>
            <p class="text-sm text-gray-700 leading-relaxed">{{ order.description }}</p>
          </div>

          <div v-if="order.photoUrls.length > 0" class="pt-3 border-t border-gray-100">
            <div class="info-label mb-2">现场照片</div>
            <div class="flex flex-wrap gap-2">
              <img
                v-for="(url, idx) in order.photoUrls"
                :key="idx"
                :src="url"
                class="w-20 h-20 object-cover rounded-lg"
                @click="previewImage(url)"
              />
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-4 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            <el-icon class="text-blue-500"><List /></el-icon>
            <span class="font-semibold text-gray-800">维修进度</span>
          </div>

          <el-timeline>
            <el-timeline-item
              v-for="(progress, idx) in order.progressUpdates"
              :key="progress.id"
              :timestamp="formatDate(progress.createdAt, 'MM-DD HH:mm')"
              placement="top"
            >
              <template #dot>
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
              </template>
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-sm text-gray-700 mb-2">{{ progress.content }}</p>
                <div v-if="progress.photoUrls.length > 0" class="flex flex-wrap gap-2">
                  <img
                    v-for="(url, pIdx) in progress.photoUrls"
                    :key="pIdx"
                    :src="url"
                    class="w-16 h-16 object-cover rounded-md"
                    @click="previewImage(url)"
                  />
                </div>
              </div>
            </el-timeline-item>

            <el-timeline-item
              v-for="(history, idx) in order.statusHistory"
              :key="history.id"
              :timestamp="formatDate(history.createdAt, 'MM-DD HH:mm')"
              placement="top"
              :type="getStatusTimelineType(history.status)"
            >
              <div class="text-sm text-gray-600">
                状态变更为：<span class="font-medium">{{ formatStatus(history.status) }}</span>
                <span v-if="history.remark" class="text-gray-500 ml-2">（{{ history.remark }}）</span>
              </div>
            </el-timeline-item>
          </el-timeline>

          <div v-if="order.progressUpdates.length === 0 && order.statusHistory.length === 0" class="text-center py-8">
            <el-empty description="暂无进度记录" :image-size="80" />
          </div>
        </div>

        <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div class="max-w-3xl mx-auto flex gap-3">
            <el-button
              v-if="order.status === 'assigned'"
              type="primary"
              class="flex-1 h-11"
              :loading="actionLoading"
              @click="handleStartRepair"
            >
              <el-icon><VideoPlay /></el-icon>
              开始维修
            </el-button>

            <el-button
              v-if="order.status === 'repairing'"
              class="flex-1 h-11"
              @click="showProgressDialog = true"
            >
              <el-icon><Edit /></el-icon>
              更新进度
            </el-button>

            <el-button
              v-if="order.status === 'repairing'"
              type="success"
              class="flex-1 h-11"
              :loading="actionLoading"
              @click="handleCompleteRepair"
            >
              <el-icon><CircleCheck /></el-icon>
              完成维修
            </el-button>

            <el-button
              v-if="order.status === 'checking' || order.status === 'completed'"
              type="info"
              class="flex-1 h-11"
              disabled
            >
              {{ order.status === 'checking' ? '待业主验收' : '已完成' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showProgressDialog" title="更新维修进度" width="90%" max-width="480px">
      <el-form :model="progressForm" label-position="top">
        <el-form-item label="进度说明" required>
          <el-input
            v-model="progressForm.content"
            type="textarea"
            :rows="3"
            placeholder="请输入维修进度说明..."
          />
        </el-form-item>
        <el-form-item label="照片URL（可选，多个用逗号分隔）">
          <el-input
            v-model="progressForm.photoUrls"
            type="textarea"
            :rows="2"
            placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProgressDialog = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="handleAddProgress">
          确认提交
        </el-button>
      </template>
    </el-dialog>

    <el-image-viewer
      v-if="showViewer"
      :url-list="[currentPreviewUrl]"
      :initial-index="0"
      @close="showViewer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElImageViewer } from 'element-plus'
import {
  ArrowLeft,
  List,
  VideoPlay,
  Edit,
  CircleCheck
} from '@element-plus/icons-vue'
import { getOrder, updateOrderStatus, addProgress } from '@/api/orders'
import { useUserStore } from '@/stores/user'
import { formatDate, formatStatus, formatUrgency, formatRepairType } from '@/utils/format'
import type { WorkOrder, OrderStatus, UrgencyLevel } from '@shared/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const actionLoading = ref(false)
const order = ref<WorkOrder | null>(null)
const showProgressDialog = ref(false)
const showViewer = ref(false)
const currentPreviewUrl = ref('')

const progressForm = reactive({
  content: '',
  photoUrls: ''
})

function getStatusTagType(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: 'info',
    assigned: 'warning',
    repairing: 'primary',
    checking: 'warning',
    completed: 'success',
    rejected: 'danger'
  }
  return map[status]
}

function getUrgencyTagType(urgency: UrgencyLevel) {
  const map: Record<UrgencyLevel, string> = {
    normal: 'info',
    urgent: 'warning',
    very_urgent: 'danger'
  }
  return map[urgency]
}

function getStatusTimelineType(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: 'info',
    assigned: 'warning',
    repairing: 'primary',
    checking: 'warning',
    completed: 'success',
    rejected: 'danger'
  }
  return map[status]
}

function previewImage(url: string) {
  currentPreviewUrl.value = url
  showViewer.value = true
}

function goBack() {
  router.back()
}

async function fetchOrderDetail() {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    order.value = await getOrder(id)
  } finally {
    loading.value = false
  }
}

async function handleStartRepair() {
  if (!order.value || !userStore.user?.id) return
  actionLoading.value = true
  try {
    await updateOrderStatus(order.value.id, 'repairing', '维修人员开始维修')
    ElMessage.success('已开始维修')
    await fetchOrderDetail()
  } finally {
    actionLoading.value = false
  }
}

async function handleAddProgress() {
  if (!order.value || !userStore.user?.id || !progressForm.content.trim()) {
    ElMessage.warning('请输入进度说明')
    return
  }
  actionLoading.value = true
  try {
    const photoUrls = progressForm.photoUrls
      .split(',')
      .map(u => u.trim())
      .filter(u => u)
    await addProgress(order.value.id, {
      staffId: userStore.user.id,
      content: progressForm.content.trim(),
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined
    })
    ElMessage.success('进度已更新')
    showProgressDialog.value = false
    progressForm.content = ''
    progressForm.photoUrls = ''
    await fetchOrderDetail()
  } finally {
    actionLoading.value = false
  }
}

async function handleCompleteRepair() {
  if (!order.value || !userStore.user?.id) return
  actionLoading.value = true
  try {
    await updateOrderStatus(order.value.id, 'checking', '维修完成，申请业主验收')
    ElMessage.success('已提交验收申请')
    await fetchOrderDetail()
  } finally {
    actionLoading.value = false
  }
}

onMounted(fetchOrderDetail)
</script>

<style scoped>
.timeout-border {
  border: 1px solid #fecaca;
  background: linear-gradient(to right, #fef2f2, #ffffff);
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

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #9ca3af;
}
</style>
