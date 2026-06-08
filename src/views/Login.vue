<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <el-icon :size="40" color="white"><Tools /></el-icon>
          </div>
          <h1 class="text-2xl font-bold text-gray-800">小区物业报修管理系统</h1>
          <p class="text-gray-500 mt-2">请选择您的身份登录</p>
        </div>

        <el-radio-group v-model="loginRole" class="w-full mb-6">
          <div class="grid grid-cols-3 gap-3">
            <el-radio-button value="owner" class="!w-full text-center">
              <div class="py-2">
                <el-icon :size="24"><User /></el-icon>
                <div class="text-xs mt-1">业主</div>
              </div>
            </el-radio-button>
            <el-radio-button value="staff" class="!w-full text-center">
              <div class="py-2">
                <el-icon :size="24"><Setting /></el-icon>
                <div class="text-xs mt-1">维修人员</div>
              </div>
            </el-radio-button>
            <el-radio-button value="admin" class="!w-full text-center">
              <div class="py-2">
                <el-icon :size="24"><Avatar /></el-icon>
                <div class="text-xs mt-1">管理员</div>
              </div>
            </el-radio-button>
          </div>
        </el-radio-group>

        <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent>
          <template v-if="loginRole === 'owner'">
            <el-form-item prop="building">
              <el-select v-model="form.building" placeholder="选择楼栋" class="w-full">
                <el-option
                  v-for="b in buildingData"
                  :key="b.building"
                  :label="b.building"
                  :value="b.building"
                />
              </el-select>
            </el-form-item>
            <el-form-item prop="unit">
              <el-select v-model="form.unit" placeholder="选择单元" class="w-full" :disabled="!form.building">
                <el-option
                  v-for="u in currentUnits"
                  :key="u.unit"
                  :label="u.unit"
                  :value="u.unit"
                />
              </el-select>
            </el-form-item>
            <el-form-item prop="roomNo">
              <el-select v-model="form.roomNo" placeholder="选择房号" class="w-full" :disabled="!form.unit">
                <el-option
                  v-for="r in currentRooms"
                  :key="r"
                  :label="r"
                  :value="r"
                />
              </el-select>
            </el-form-item>
          </template>

          <template v-else>
            <el-form-item prop="username">
              <el-input v-model="form.username" :placeholder="loginRole === 'admin' ? '管理员账号' : '维修工号'" :prefix-icon="loginRole === 'admin' ? Avatar : Setting" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="form.password" type="password" placeholder="密码" show-password :prefix-icon="Lock" />
            </el-form-item>
          </template>

          <el-button
            type="primary"
            class="w-full h-12 text-base font-medium"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form>

        <div class="mt-6 text-center text-sm text-gray-500">
          <template v-if="loginRole === 'admin'">
            默认账号：admin / 123456
          </template>
          <template v-else-if="loginRole === 'staff'">
            测试工号：W001 / 123456
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Tools, User, Setting, Avatar, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { login } from '@/api/auth'
import { getBuildingData } from '@/api/buildings'
import type { UserRole, BuildingData } from '@shared/types'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const loginRole = ref<UserRole>('owner')
const buildingData = ref<BuildingData[]>([])

const form = reactive({
  username: '',
  password: '',
  building: '',
  unit: '',
  roomNo: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  building: [{ required: true, message: '请选择楼栋', trigger: 'change' }],
  unit: [{ required: true, message: '请选择单元', trigger: 'change' }],
  roomNo: [{ required: true, message: '请选择房号', trigger: 'change' }]
}

const currentUnits = computed(() => {
  const building = buildingData.value.find(b => b.building === form.building)
  return building?.units || []
})

const currentRooms = computed(() => {
  const unit = currentUnits.value.find(u => u.unit === form.unit)
  return unit?.rooms || []
})

onMounted(async () => {
  buildingData.value = await getBuildingData()
})

async function handleLogin() {
  if (!formRef.value) return
  
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const response = await login({
      role: loginRole.value,
      username: form.username,
      password: form.password,
      building: form.building,
      unit: form.unit,
      roomNo: form.roomNo
    })

    if (response.success) {
      userStore.setUser(response.user)
      ElMessage.success('登录成功')
      
      const routeMap: Record<string, string> = {
        owner: '/owner',
        admin: '/admin',
        staff: '/staff'
      }
      router.push(routeMap[loginRole.value])
    } else {
      ElMessage.error((response as any).error || '登录失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.animate-fadeIn {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
