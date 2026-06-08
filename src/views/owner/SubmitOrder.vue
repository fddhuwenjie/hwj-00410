<template>
  <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-100">
      <h2 class="font-bold text-lg text-gray-800">提交报修</h2>
      <p class="text-xs text-gray-500 mt-1">请填写以下信息，我们会尽快安排维修人员</p>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" class="p-4" @submit.prevent>
      <div class="mb-6">
        <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <el-icon><Location /></el-icon>
          房屋信息
        </h3>
        <div class="grid grid-cols-3 gap-3">
          <el-form-item prop="building" class="mb-0">
            <el-select v-model="form.building" placeholder="楼栋" class="w-full" @change="handleBuildingChange">
              <el-option
                v-for="b in buildingData"
                :key="b.building"
                :label="b.building"
                :value="b.building"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="unit" class="mb-0">
            <el-select v-model="form.unit" placeholder="单元" class="w-full" :disabled="!form.building" @change="handleUnitChange">
              <el-option
                v-for="u in currentUnits"
                :key="u.unit"
                :label="u.unit"
                :value="u.unit"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="roomNo" class="mb-0">
            <el-select v-model="form.roomNo" placeholder="房号" class="w-full" :disabled="!form.unit">
              <el-option
                v-for="r in currentRooms"
                :key="r"
                :label="r"
                :value="r"
              />
            </el-select>
          </el-form-item>
        </div>
      </div>

      <div class="mb-6">
        <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <el-icon><Tools /></el-icon>
          报修类型
        </h3>
        <el-form-item prop="repairType" class="mb-0">
          <div class="grid grid-cols-4 gap-2">
            <div
              v-for="type in repairTypes"
              :key="type.value"
              class="flex flex-col items-center gap-1 p-3 rounded-xl cursor-pointer border-2 transition-all"
              :class="form.repairType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'"
              @click="form.repairType = type.value"
            >
              <el-icon :size="24" :class="form.repairType === type.value ? 'text-blue-500' : 'text-gray-400'">
                <component :is="type.icon" />
              </el-icon>
              <span class="text-xs" :class="form.repairType === type.value ? 'text-blue-600 font-medium' : 'text-gray-600'">{{ type.label }}</span>
            </div>
          </div>
        </el-form-item>
      </div>

      <div class="mb-6">
        <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <el-icon><Edit /></el-icon>
          问题描述
        </h3>
        <el-form-item prop="description" class="mb-0">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述您遇到的问题，包括具体位置、现象等..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </div>

      <div class="mb-6">
        <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <el-icon><Warning /></el-icon>
          紧急程度
        </h3>
        <el-form-item prop="urgency" class="mb-0">
          <el-radio-group v-model="form.urgency" class="w-full">
            <div class="grid grid-cols-3 gap-3">
              <el-radio-button value="normal" class="!w-full text-center">
                <div class="py-2">
                  <el-icon :size="20"><Clock /></el-icon>
                  <div class="text-xs mt-1">一般</div>
                </div>
              </el-radio-button>
              <el-radio-button value="urgent" class="!w-full text-center">
                <div class="py-2">
                  <el-icon :size="20"><WarningFilled /></el-icon>
                  <div class="text-xs mt-1">紧急</div>
                </div>
              </el-radio-button>
              <el-radio-button value="very_urgent" class="!w-full text-center">
                <div class="py-2">
                  <el-icon :size="20"><CircleCloseFilled /></el-icon>
                  <div class="text-xs mt-1">非常紧急</div>
                </div>
              </el-radio-button>
            </div>
          </el-radio-group>
        </el-form-item>
      </div>

      <div class="mb-6">
        <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <el-icon><Picture /></el-icon>
          照片链接
          <span class="text-xs text-gray-400 font-normal">（可选，每行一个URL）</span>
        </h3>
        <el-form-item prop="photoUrls" class="mb-0">
          <el-input
            v-model="photoUrlsText"
            type="textarea"
            :rows="3"
            placeholder="请输入照片URL，每行一个&#10;例如：&#10;https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
          />
        </el-form-item>
        <div v-if="photoPreviewUrls.length > 0" class="flex flex-wrap gap-2 mt-3">
          <div
            v-for="(url, index) in photoPreviewUrls"
            :key="index"
            class="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200"
          >
            <img :src="url" class="w-full h-full object-cover" @error="handleImageError($event, index)" />
            <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center cursor-pointer" @click="removePhotoUrl(index)">
              <el-icon :size="20" color="white" class="opacity-0 hover:opacity-100 transition-opacity"><Close /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <el-button
        type="primary"
        size="large"
        class="w-full h-12 text-base font-medium rounded-xl"
        :loading="submitting"
        @click="handleSubmit"
      >
        提交报修
      </el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  Location, Tools, Edit, Warning, Picture, Close, Clock,
  WarningFilled, CircleCloseFilled, HotWater, Lightning,
  Switch, Picture as PictureFilled, OfficeBuilding, Connection, MoreFilled
} from '@element-plus/icons-vue'
import { createOrder } from '@/api/orders'
import { getBuildingData } from '@/api/buildings'
import type { RepairType, UrgencyLevel, BuildingData } from '@shared/types'

const router = useRouter()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const buildingData = ref<BuildingData[]>([])
const photoUrlsText = ref('')

const form = reactive({
  building: '',
  unit: '',
  roomNo: '',
  repairType: '' as RepairType | '',
  description: '',
  urgency: 'normal' as UrgencyLevel
})

const repairTypes = [
  { label: '水管', value: 'water' as RepairType, icon: HotWater },
  { label: '电路', value: 'electric' as RepairType, icon: Lightning },
  { label: '门窗', value: 'door_window' as RepairType, icon: Switch },
  { label: '墙面', value: 'wall' as RepairType, icon: PictureFilled },
  { label: '公共设施', value: 'public' as RepairType, icon: OfficeBuilding },
  { label: '电梯', value: 'elevator' as RepairType, icon: Connection },
  { label: '其他', value: 'other' as RepairType, icon: MoreFilled }
]

const rules: FormRules = {
  building: [{ required: true, message: '请选择楼栋', trigger: 'change' }],
  unit: [{ required: true, message: '请选择单元', trigger: 'change' }],
  roomNo: [{ required: true, message: '请选择房号', trigger: 'change' }],
  repairType: [{ required: true, message: '请选择报修类型', trigger: 'change' }],
  description: [
    { required: true, message: '请输入问题描述', trigger: 'blur' },
    { min: 10, message: '描述至少10个字', trigger: 'blur' }
  ],
  urgency: [{ required: true, message: '请选择紧急程度', trigger: 'change' }]
}

const currentUnits = computed(() => {
  const building = buildingData.value.find(b => b.building === form.building)
  return building?.units || []
})

const currentRooms = computed(() => {
  const unit = currentUnits.value.find(u => u.unit === form.unit)
  return unit?.rooms || []
})

const photoPreviewUrls = computed(() => {
  return photoUrlsText.value.split('\n').filter(url => url.trim())
})

function handleBuildingChange() {
  form.unit = ''
  form.roomNo = ''
}

function handleUnitChange() {
  form.roomNo = ''
}

function handleImageError(event: Event, index: number) {
  const target = event.target as HTMLImageElement
  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect fill="%23f3f4f6" width="80" height="80"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="12" text-anchor="middle" x="40" y="45"%3E图片加载失败%3C/text%3E%3C/svg%3E'
}

function removePhotoUrl(index: number) {
  const urls = photoUrlsText.value.split('\n').filter(url => url.trim())
  urls.splice(index, 1)
  photoUrlsText.value = urls.join('\n')
}

async function handleSubmit() {
  if (!formRef.value) return
  
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const photoUrls = photoUrlsText.value.split('\n').filter(url => url.trim())
    const result = await createOrder({
      building: form.building,
      unit: form.unit,
      roomNo: form.roomNo,
      repairType: form.repairType as RepairType,
      description: form.description,
      urgency: form.urgency,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined
    })
    ElMessage.success('报修提交成功')
    router.push(`/owner/order/${result.id}`)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  buildingData.value = await getBuildingData()
})
</script>

<style scoped>
.el-radio-button :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 0;
  border-radius: 12px !important;
}
</style>
