<template>
  <div v-loading="loading" class="space-y-4">
    <div class="bg-white rounded-2xl shadow-sm p-4" v-if="bill">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="font-bold text-gray-800 mb-1">账单详情</h3>
          <p class="text-xs text-gray-500">工单号：{{ bill.orderNo }}</p>
        </div>
        <el-button
          text
          size="small"
          @click="router.back()"
          class="!p-0"
        >
          <el-icon><ArrowLeft /></el-icon>
          <span class="ml-1">返回</span>
        </el-button>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm mb-4 pb-4 border-b border-gray-100">
        <div class="flex items-center gap-2 text-gray-600">
          <el-icon><Location /></el-icon>
          <span>{{ bill.building }} {{ bill.ownerRoom }}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600">
          <el-icon><Clock /></el-icon>
          <span>{{ formatDate(bill.createdAt, 'YYYY-MM-DD HH:mm') }}</span>
        </div>
        <div class="flex items-center gap-2" :class="bill.status === 'paid' ? 'text-green-600' : 'text-orange-500'">
          <el-tag
            :type="bill.status === 'paid' ? 'success' : 'warning'"
            effect="light"
            size="small"
          >
            {{ bill.status === 'paid' ? '已支付' : '未支付' }}
          </el-tag>
        </div>
        <div v-if="bill.paidAt" class="flex items-center gap-2 text-gray-600">
          <el-icon><Wallet /></el-icon>
          <span>{{ formatDate(bill.paidAt, 'YYYY-MM-DD HH:mm') }}</span>
        </div>
      </div>

      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <el-icon><Service /></el-icon>
          人工费明细
        </h4>
        <el-table :data="[bill.laborDetail]" border size="small" class="text-xs">
          <el-table-column prop="startTime" label="开始时间">
            <template #default="{ row }">
              {{ formatDate(row.startTime, 'MM-DD HH:mm') }}
            </template>
          </el-table-column>
          <el-table-column prop="endTime" label="结束时间">
            <template #default="{ row }">
              {{ formatDate(row.endTime, 'MM-DD HH:mm') }}
            </template>
          </el-table-column>
          <el-table-column prop="durationHours" label="时长" width="70">
            <template #default="{ row }">
              {{ row.durationHours.toFixed(1) }}小时
            </template>
          </el-table-column>
          <el-table-column prop="hourlyRate" label="时薪" width="70">
            <template #default="{ row }">
              {{ formatCurrency(row.hourlyRate) }}
            </template>
          </el-table-column>
          <el-table-column prop="subtotal" label="小计" width="80" align="right">
            <template #default="{ row }">
              <span class="font-medium">{{ formatCurrency(row.subtotal) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="mt-2 text-xs text-gray-500 text-right">
          人工费合计：<span class="font-medium text-gray-700">{{ formatCurrency(bill.laborCost) }}</span>
        </div>
      </div>

      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <el-icon><Goods /></el-icon>
          物料费明细
        </h4>
        <el-table v-if="bill.materialDetails.length > 0" :data="bill.materialDetails" border size="small" class="text-xs">
          <el-table-column prop="materialName" label="物料名称" />
          <el-table-column prop="quantity" label="数量" width="60" align="center" />
          <el-table-column prop="unitPrice" label="单价" width="70">
            <template #default="{ row }">
              {{ formatCurrency(row.unitPrice) }}
            </template>
          </el-table-column>
          <el-table-column prop="totalPrice" label="小计" width="80" align="right">
            <template #default="{ row }">
              <span class="font-medium">{{ formatCurrency(row.totalPrice) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无物料" :image-size="60" />
        <div class="mt-2 text-xs text-gray-500 text-right">
          物料费合计：<span class="font-medium text-gray-700">{{ formatCurrency(bill.materialCost) }}</span>
        </div>
      </div>

      <div class="mb-4 pb-4 border-b border-gray-100">
        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <el-icon><Van /></el-icon>
          上门费
        </h4>
        <div class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-600">上门服务费</span>
          <span class="font-medium">{{ formatCurrency(bill.visitFee) }}</span>
        </div>
      </div>

      <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 mb-4">
        <div class="flex items-center justify-between">
          <span class="text-gray-700 font-medium">总计金额</span>
          <span class="text-3xl font-bold text-orange-500">{{ formatCurrency(bill.totalAmount) }}</span>
        </div>
      </div>

      <el-button
        v-if="bill.status === 'unpaid'"
        type="primary"
        size="large"
        class="w-full bg-gradient-to-r from-orange-500 to-orange-600 !border-none"
        :loading="paying"
        @click="handlePay"
      >
        立即支付
      </el-button>
      <div v-else class="text-center py-3 bg-green-50 rounded-xl">
        <el-tag type="success" effect="dark" size="large">
          <el-icon class="mr-1"><CircleCheck /></el-icon>
          已支付
        </el-tag>
        <p v-if="bill.paidAt" class="text-xs text-gray-500 mt-2">
          支付时间：{{ formatDate(bill.paidAt, 'YYYY-MM-DD HH:mm:ss') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Location, Clock, Wallet, Service, Goods, Van, CircleCheck
} from '@element-plus/icons-vue'
import { getBill, payBill } from '@/api/bills'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Bill } from '@shared/types'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const paying = ref(false)
const bill = ref<Bill | null>(null)

async function loadBill() {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  try {
    bill.value = await getBill(id)
  } finally {
    loading.value = false
  }
}

async function handlePay() {
  if (!bill.value) return

  paying.value = true
  try {
    await payBill(bill.value.id)
    ElMessage.success('支付成功')
    loadBill()
  } finally {
    paying.value = false
  }
}

onMounted(() => {
  loadBill()
})
</script>
