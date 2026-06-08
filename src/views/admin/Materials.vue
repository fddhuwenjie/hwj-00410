<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">物料库存管理</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新增物料
      </el-button>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <el-form-item label="分类" class="mb-0">
          <el-select v-model="filterCategory" placeholder="全部分类" clearable style="width: 140px">
            <el-option label="管件" value="管件" />
            <el-option label="电料" value="电料" />
            <el-option label="五金" value="五金" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存状态" class="mb-0">
          <el-checkbox v-model="filterLowStock">仅显示库存不足</el-checkbox>
        </el-form-item>
        <el-button type="primary" @click="loadMaterials">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm">
      <el-table :data="materials" border stripe v-loading="loading">
        <el-table-column prop="name" label="物料名称" min-width="140" />
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag type="primary">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column label="单价" width="100">
          <template #default="{ row }">
            ¥{{ row.unitPrice.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="库存数量" width="120">
          <template #default="{ row }">
            <span :class="row.lowStock ? 'text-red-600 font-bold' : ''">
              {{ row.stockQuantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="安全阈值" width="100">
          <template #default="{ row }">
            {{ row.safetyThreshold }}
          </template>
        </el-table-column>
        <el-table-column label="库存状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.lowStock" type="danger">库存不足</el-tag>
            <el-tag v-else type="success">库存充足</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openStockDialog(row)">
              <el-icon><Plus /></el-icon>
              入库
            </el-button>
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
          @size-change="loadMaterials"
          @current-change="loadMaterials"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingMaterial ? '编辑物料' : '新增物料'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="物料名称" required>
          <el-input v-model="formData.name" placeholder="请输入物料名称" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="管件" value="管件" />
            <el-option label="电料" value="电料" />
            <el-option label="五金" value="五金" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位" required>
          <el-input v-model="formData.unit" placeholder="如：米、个、套、卷" />
        </el-form-item>
        <el-form-item label="单价" required>
          <el-input-number
            v-model="formData.unitPrice"
            :min="0"
            :precision="2"
            :step="0.5"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="初始库存" required>
          <el-input-number
            v-model="formData.stockQuantity"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="安全阈值" required>
          <el-input-number
            v-model="formData.safetyThreshold"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确认提交
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="stockDialogVisible"
      title="物料入库"
      width="400px"
      :close-on-click-modal="false"
    >
      <div v-if="stockMaterial" class="mb-4">
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span class="text-gray-600">物料名称</span>
          <span class="font-medium">{{ stockMaterial.name }}</span>
        </div>
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mt-2">
          <span class="text-gray-600">当前库存</span>
          <span class="font-medium">{{ stockMaterial.stockQuantity }} {{ stockMaterial.unit }}</span>
        </div>
      </div>
      <el-form label-width="100px">
        <el-form-item label="入库数量" required>
          <el-input-number
            v-model="stockQuantity"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stockSubmitting" @click="handleStockSubmit">
          确认入库
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  updateStock
} from '@/api/materials'
import { formatDate } from '@/utils/format'
import type { Material, MaterialCategory } from '@shared/types'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'

const loading = ref(false)
const materials = ref<Material[]>([])
const filterCategory = ref<MaterialCategory | ''>('')
const filterLowStock = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const dialogVisible = ref(false)
const stockDialogVisible = ref(false)
const submitting = ref(false)
const stockSubmitting = ref(false)
const editingMaterial = ref<Material | null>(null)
const stockMaterial = ref<Material | null>(null)
const stockQuantity = ref(1)

const formData = reactive({
  name: '',
  category: '管件' as MaterialCategory,
  unit: '',
  unitPrice: 0,
  stockQuantity: 0,
  safetyThreshold: 10
})

async function loadMaterials() {
  loading.value = true
  try {
    const params: {
      category?: MaterialCategory
      lowStock?: boolean
      page: number
      pageSize: number
    } = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterCategory.value) {
      params.category = filterCategory.value
    }
    if (filterLowStock.value) {
      params.lowStock = true
    }
    const res = await getMaterials(params)
    materials.value = res.data
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterCategory.value = ''
  filterLowStock.value = false
  pagination.page = 1
  loadMaterials()
}

function openCreateDialog() {
  editingMaterial.value = null
  formData.name = ''
  formData.category = '管件'
  formData.unit = ''
  formData.unitPrice = 0
  formData.stockQuantity = 0
  formData.safetyThreshold = 10
  dialogVisible.value = true
}

function openEditDialog(material: Material) {
  editingMaterial.value = material
  formData.name = material.name
  formData.category = material.category
  formData.unit = material.unit
  formData.unitPrice = material.unitPrice
  formData.stockQuantity = material.stockQuantity
  formData.safetyThreshold = material.safetyThreshold
  dialogVisible.value = true
}

function openStockDialog(material: Material) {
  stockMaterial.value = material
  stockQuantity.value = 1
  stockDialogVisible.value = true
}

async function handleSubmit() {
  if (!formData.name || !formData.category || !formData.unit) {
    ElMessage.warning('请填写完整信息')
    return
  }

  submitting.value = true
  try {
    if (editingMaterial.value) {
      await updateMaterial(editingMaterial.value.id, formData)
      ElMessage.success('更新成功')
    } else {
      await createMaterial(formData)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadMaterials()
  } finally {
    submitting.value = false
  }
}

async function handleStockSubmit() {
  if (!stockMaterial.value) return

  stockSubmitting.value = true
  try {
    await updateStock(stockMaterial.value.id, stockQuantity.value)
    ElMessage.success('入库成功')
    stockDialogVisible.value = false
    loadMaterials()
  } finally {
    stockSubmitting.value = false
  }
}

async function handleDelete(material: Material) {
  try {
    await ElMessageBox.confirm(`确定要删除物料"${material.name}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteMaterial(material.id)
    ElMessage.success('删除成功')
    loadMaterials()
  } catch {
  }
}

onMounted(() => {
  loadMaterials()
})
</script>
