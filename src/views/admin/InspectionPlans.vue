<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">巡检计划管理</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建计划
      </el-button>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <el-form-item label="状态" class="mb-0">
          <el-select v-model="filterActive" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="loadPlans">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm">
      <el-table :data="plans" border stripe v-loading="loading">
        <el-table-column prop="name" label="计划名称" min-width="180" />
        <el-table-column prop="area" label="巡检区域" min-width="180" />
        <el-table-column label="巡检周期" width="100">
          <template #default="{ row }">
            <el-tag type="primary">{{ formatInspectionCycle(row.cycle) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="巡检项目" min-width="250">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <el-tag
                v-for="item in row.items"
                :key="item"
                size="small"
                type="info"
              >
                {{ item }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
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
          @size-change="loadPlans"
          @current-change="loadPlans"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingPlan ? '编辑巡检计划' : '新建巡检计划'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="计划名称" required>
          <el-input v-model="formData.name" placeholder="请输入计划名称" />
        </el-form-item>
        <el-form-item label="巡检区域" required>
          <el-input v-model="formData.area" placeholder="请输入巡检区域" />
        </el-form-item>
        <el-form-item label="巡检周期" required>
          <el-select v-model="formData.cycle" placeholder="请选择巡检周期" style="width: 100%">
            <el-option label="每日" value="daily" />
            <el-option label="每周" value="weekly" />
            <el-option label="每月" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item label="巡检项目" required>
          <el-select
            v-model="selectedItems"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入巡检项目，回车添加"
            style="width: 100%"
            @change="handleItemsChange"
          >
            <el-option
              v-for="item in defaultItems"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editingPlan" label="状态">
          <el-switch v-model="formData.isActive" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确认提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getInspectionPlans,
  createInspectionPlan,
  updateInspectionPlan,
  deleteInspectionPlan
} from '@/api/inspections'
import { formatDate, formatInspectionCycle } from '@/utils/format'
import type { InspectionPlan, InspectionCycle } from '@shared/types'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'

const loading = ref(false)
const plans = ref<InspectionPlan[]>([])
const filterActive = ref<boolean | undefined>(undefined)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const dialogVisible = ref(false)
const submitting = ref(false)
const editingPlan = ref<InspectionPlan | null>(null)
const selectedItems = ref<string[]>([])

const defaultItems = [
  '消防栓', '灭火器', '烟雾报警器', '应急照明', '疏散通道',
  '电梯运行声音', '按钮功能', '门开关', '应急电话', '平层精度',
  '路灯', '楼道灯', '地下车库灯', '景观灯', '应急出口灯',
  '乔木生长', '灌木修剪', '草坪状况', '病虫害', '灌溉设施'
]

const formData = reactive({
  name: '',
  area: '',
  cycle: 'daily' as InspectionCycle,
  items: [] as string[],
  isActive: true
})

function handleItemsChange(val: string[]) {
  formData.items = val
}

async function loadPlans() {
  loading.value = true
  try {
    const params: { isActive?: boolean; page: number; pageSize: number } = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterActive.value !== undefined) {
      params.isActive = filterActive.value
    }
    const res = await getInspectionPlans(params)
    plans.value = res.data
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterActive.value = undefined
  pagination.page = 1
  loadPlans()
}

function openCreateDialog() {
  editingPlan.value = null
  formData.name = ''
  formData.area = ''
  formData.cycle = 'daily'
  formData.items = []
  formData.isActive = true
  selectedItems.value = []
  dialogVisible.value = true
}

function openEditDialog(plan: InspectionPlan) {
  editingPlan.value = plan
  formData.name = plan.name
  formData.area = plan.area
  formData.cycle = plan.cycle
  formData.items = [...plan.items]
  formData.isActive = plan.isActive
  selectedItems.value = [...plan.items]
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formData.name || !formData.area || !formData.cycle || formData.items.length === 0) {
    ElMessage.warning('请填写完整信息')
    return
  }

  submitting.value = true
  try {
    if (editingPlan.value) {
      await updateInspectionPlan(editingPlan.value.id, formData)
      ElMessage.success('更新成功')
    } else {
      await createInspectionPlan({
        ...formData,
        createdBy: 'admin'
      })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadPlans()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(plan: InspectionPlan) {
  try {
    await ElMessageBox.confirm(`确定要删除计划"${plan.name}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteInspectionPlan(plan.id)
    ElMessage.success('删除成功')
    loadPlans()
  } catch {
  }
}

onMounted(() => {
  loadPlans()
})
</script>
