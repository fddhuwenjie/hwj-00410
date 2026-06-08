<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">账单管理</h2>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <el-form-item label="状态" class="mb-0">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="未付" value="unpaid" />
            <el-option label="已付" value="paid" />
          </el-select>
        </el-form-item>
        <el-form-item label="楼栋" class="mb-0">
          <el-select v-model="filterBuilding" placeholder="全部楼栋" clearable style="width: 140px">
            <el-option
              v-for="building in buildingList"
              :key="building.building"
              :label="building.building + '号楼'"
              :value="building.building"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="月份" class="mb-0">
          <el-date-picker
            v-model="filterMonth"
            type="month"
            placeholder="选择月份"
            value-format="YYYY-MM"
            clearable
            style="width: 160px"
          />
        </el-form-item>
        <el-button type="primary" @click="loadBills">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm">
      <el-table
        :data="bills"
        border
        stripe
        v-loading="loading"
      >
        <el-table-column prop="orderNo" label="工单号" width="140" />
        <el-table-column label="房屋信息" width="140">
          <template #default="{ row }">
            {{ row.ownerRoom }}
          </template>
        </el-table-column>
        <el-table-column label="总金额" width="120">
          <template #default="{ row }">
            <span class="font-semibold text-gray-800">{{ formatCurrency(row.totalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="人工费" width="120">
          <template #default="{ row }">
            {{ formatCurrency(row.laborCost) }}
          </template>
        </el-table-column>
        <el-table-column label="物料费" width="120">
          <template #default="{ row }">
            {{ formatCurrency(row.materialCost) }}
          </template>
        </el-table-column>
        <el-table-column label="上门费" width="120">
          <template #default="{ row }">
            {{ formatCurrency(row.visitFee) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ formatBillStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="支付时间" width="160">
          <template #default="{ row }">
            {{ row.paidAt ? formatDate(row.paidAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button
              v-if="row.status === 'unpaid'"
              type="success"
              size="small"
              @click="markPaid(row)"
            >
              <el-icon><Check /></el-icon>
              标记支付
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
          @size-change="loadBills"
          @current-change="loadBills"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBills, payBill } from '@/api/bills'
import { getBuildingData } from '@/api/buildings'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Bill, BuildingData } from '@shared/types'
import { Search, View, Check } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(false)
const bills = ref<Bill[]>([])
const buildingList = ref<BuildingData[]>([])

const filterStatus = ref<'unpaid' | 'paid' | ''>('')
const filterBuilding = ref('')
const filterMonth = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

function formatBillStatus(status: 'unpaid' | 'paid'): string {
  const statusMap: Record<'unpaid' | 'paid', string> = {
    unpaid: '未付',
    paid: '已付'
  }
  return statusMap[status] || status
}

function getStatusTagType(status: 'unpaid' | 'paid'): string {
  const typeMap: Record<'unpaid' | 'paid', string> = {
    unpaid: 'warning',
    paid: 'success'
  }
  return typeMap[status] || ''
}

async function loadBuildingData() {
  try {
    buildingList.value = await getBuildingData()
  } catch (e) {
    console.error('加载楼栋数据失败', e)
  }
}

async function loadBills() {
  loading.value = true
  try {
    const params: {
      status?: string
      building?: string
      month?: string
      page?: number
      pageSize?: number
    } = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    if (filterBuilding.value) {
      params.building = filterBuilding.value
    }
    if (filterMonth.value) {
      params.month = filterMonth.value
    }
    const res = await getBills(params)
    bills.value = res.data
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterStatus.value = ''
  filterBuilding.value = ''
  filterMonth.value = ''
  pagination.page = 1
  loadBills()
}

function viewDetail(row: Bill) {
  router.push(`/admin/bills/${row.id}`)
}

async function markPaid(row: Bill) {
  try {
    await ElMessageBox.confirm(
      `确定要将账单 ${row.orderNo} 标记为已支付吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await payBill(row.id)
    ElMessage.success('标记支付成功')
    loadBills()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('标记支付失败', e)
    }
  }
}

onMounted(() => {
  loadBuildingData()
  loadBills()
})
</script>
