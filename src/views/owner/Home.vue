<template>
  <div class="space-y-4">
    <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
      <el-carousel height="160px" indicator-position="outside" arrow="never">
        <el-carousel-item v-for="announcement in activeAnnouncements" :key="announcement.id">
          <div class="h-full bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white cursor-pointer" @click="viewAnnouncement(announcement.id)">
            <div class="flex items-start gap-2 mb-2">
              <el-tag size="small" type="warning" effect="dark" v-if="announcement.isPinned">置顶</el-tag>
              <h3 class="font-bold text-base line-clamp-1">{{ announcement.title }}</h3>
            </div>
            <p class="text-sm opacity-90 line-clamp-2">{{ announcement.content }}</p>
            <p class="text-xs opacity-75 mt-2">{{ formatDate(announcement.createdAt, 'MM-DD HH:mm') }}</p>
          </div>
        </el-carousel-item>
        <el-carousel-item v-if="activeAnnouncements.length === 0">
          <div class="h-full bg-gradient-to-r from-gray-100 to-gray-200 p-4 flex items-center justify-center">
            <p class="text-gray-500">暂无公告</p>
          </div>
        </el-carousel-item>
      </el-carousel>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white rounded-2xl p-4 shadow-sm hover-lift cursor-pointer" @click="router.push('/owner/submit')">
        <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mb-3">
          <el-icon :size="28" color="white"><Tools /></el-icon>
        </div>
        <h3 class="font-bold text-gray-800">快速报修</h3>
        <p class="text-xs text-gray-500 mt-1">一键提交维修申请</p>
      </div>
      <div class="bg-white rounded-2xl p-4 shadow-sm hover-lift cursor-pointer" @click="router.push('/owner/announcements')">
        <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-3">
          <el-icon :size="28" color="white"><Reading /></el-icon>
        </div>
        <h3 class="font-bold text-gray-800">公告通知</h3>
        <p class="text-xs text-gray-500 mt-1">查看最新小区公告</p>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div class="p-4 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-gray-800">我的工单</h2>
          <el-button text type="primary" size="small" @click="activeTab = 'all'">查看全部</el-button>
        </div>
        <div class="flex gap-2 mt-3 overflow-x-auto pb-1">
          <el-tag
            v-for="tab in statusTabs"
            :key="tab.value"
            :type="activeTab === tab.value ? 'primary' : 'info'"
            :effect="activeTab === tab.value ? 'dark' : 'plain'"
            class="cursor-pointer whitespace-nowrap !rounded-full"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </el-tag>
        </div>
      </div>

      <div v-loading="loading" class="min-h-[200px]">
        <div v-if="filteredOrders.length === 0" class="py-12 text-center">
          <el-empty description="暂无工单" :image-size="80" />
        </div>
        <div v-else class="divide-y divide-gray-50">
          <div
            v-for="order in filteredOrders"
            :key="order.id"
            class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            :class="{ 'timeout-highlight': order.isTimeout }"
            @click="viewOrder(order.id)"
          >
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-800">{{ formatRepairType(order.repairType) }}</span>
                  <span v-if="order.isTimeout" class="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">已超时</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">工单号：{{ order.orderNo }}</p>
              </div>
              <span :class="['status-tag', getStatusClass(order.status)]">{{ formatStatus(order.status) }}</span>
            </div>
            <p class="text-sm text-gray-600 line-clamp-2 mb-2">{{ order.description }}</p>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span :class="['status-tag', getUrgencyClass(order.urgency)]">{{ formatUrgency(order.urgency) }}</span>
                <span class="text-xs text-gray-400">{{ order.building }}{{ order.unit }}{{ order.roomNo }}</span>
              </div>
              <span class="text-xs text-gray-400">{{ formatDate(order.createdAt, 'MM-DD HH:mm') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Tools, Reading } from '@element-plus/icons-vue'
import { getActiveAnnouncements } from '@/api/announcements'
import { getOrders } from '@/api/orders'
import { useUserStore } from '@/stores/user'
import { formatDate, formatStatus, formatUrgency, formatRepairType, getStatusClass, getUrgencyClass } from '@/utils/format'
import type { Announcement, WorkOrder, OrderStatus } from '@shared/types'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const activeAnnouncements = ref<Announcement[]>([])
const orders = ref<WorkOrder[]>([])
const activeTab = ref<OrderStatus | 'all'>('all')

const statusTabs = [
  { label: '全部', value: 'all' as const },
  { label: '待分配', value: 'pending' as OrderStatus },
  { label: '已分配', value: 'assigned' as OrderStatus },
  { label: '维修中', value: 'repairing' as OrderStatus },
  { label: '待验收', value: 'checking' as OrderStatus },
  { label: '已完成', value: 'completed' as OrderStatus },
  { label: '已驳回', value: 'rejected' as OrderStatus }
]

const filteredOrders = computed(() => {
  if (activeTab.value === 'all') {
    return orders.value
  }
  return orders.value.filter(order => order.status === activeTab.value)
})

async function loadData() {
  loading.value = true
  try {
    const [announcements, orderData] = await Promise.all([
      getActiveAnnouncements(),
      getOrders({ ownerRoom: userStore.user?.room })
    ])
    activeAnnouncements.value = announcements
    orders.value = orderData.data
  } finally {
    loading.value = false
  }
}

function viewOrder(id: string) {
  router.push(`/owner/order/${id}`)
}

function viewAnnouncement(id: string) {
  router.push('/owner/announcements')
}

onMounted(() => {
  loadData()
})
</script>
