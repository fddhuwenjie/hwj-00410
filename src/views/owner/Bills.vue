<template>
  <div class="space-y-4">
    <div class="bg-white rounded-2xl shadow-sm p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold text-gray-800">我的账单</h2>
        <el-select v-model="selectedMonth" size="small" class="w-32" @change="loadBills">
          <el-option
            v-for="month in monthOptions"
            :key="month.value"
            :label="month.label"
            :value="month.value"
          />
        </el-select>
      </div>

      <div v-loading="loading" class="min-h-[300px]">
        <div v-if="bills.length === 0 && !loading" class="py-12 text-center">
          <el-empty description="暂无账单" :image-size="80" />
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="bill in bills"
            :key="bill.id"
            class="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
            @click="viewBill(bill.id)"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-xs text-gray-500 mb-1">工单号：{{ bill.orderNo }}</p>
                <p class="text-xs text-gray-400">{{ formatDate(bill.createdAt, 'YYYY-MM-DD HH:mm') }}</p>
              </div>
              <el-tag
                :type="bill.status === 'paid' ? 'success' : 'warning'"
                effect="light"
                size="small"
              >
                {{ bill.status === 'paid' ? '已付' : '未付' }}
              </el-tag>
            </div>

            <div class="flex items-end justify-between">
              <div class="space-y-1">
                <p class="text-xs text-gray-500">费用明细</p>
                <p class="text-xs text-gray-400">
                  人工费 {{ formatCurrency(bill.laborCost) }} + 物料费 {{ formatCurrency(bill.materialCost) }} + 上门费 {{ formatCurrency(bill.visitFee) }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-500 mb-1">总计</p>
                <p class="text-2xl font-bold" :class="bill.status === 'paid' ? 'text-green-600' : 'text-orange-500'">
                  {{ formatCurrency(bill.totalAmount) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasMore && bills.length > 0" class="mt-4 text-center">
          <el-button
            type="primary"
            plain
            size="small"
            :loading="loadingMore"
            @click="loadMore"
          >
            加载更多
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { getBills } from '@/api/bills'
import { useUserStore } from '@/stores/user'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Bill } from '@shared/types'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const loadingMore = ref(false)
const bills = ref<Bill[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedMonth = ref(dayjs().format('YYYY-MM'))

const monthOptions = computed(() => {
  const options = []
  for (let i = 0; i < 6; i++) {
    const month = dayjs().subtract(i, 'month')
    options.push({
      label: month.format('YYYY年MM月'),
      value: month.format('YYYY-MM')
    })
  }
  return options
})

const hasMore = computed(() => {
  return bills.value.length < total.value
})

async function loadBills() {
  if (!userStore.user?.room) return

  loading.value = true
  page.value = 1
  try {
    const response = await getBills({
      ownerRoom: userStore.user.room,
      month: selectedMonth.value,
      page: page.value,
      pageSize: pageSize.value
    })
    bills.value = response.data
    total.value = response.total
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!userStore.user?.room || !hasMore.value) return

  loadingMore.value = true
  page.value++
  try {
    const response = await getBills({
      ownerRoom: userStore.user.room,
      month: selectedMonth.value,
      page: page.value,
      pageSize: pageSize.value
    })
    bills.value = [...bills.value, ...response.data]
    total.value = response.total
  } finally {
    loadingMore.value = false
  }
}

function viewBill(id: string) {
  router.push(`/owner/bill/${id}`)
}

onMounted(() => {
  loadBills()
})
</script>
