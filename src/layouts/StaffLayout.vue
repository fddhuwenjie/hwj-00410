<template>
  <el-container class="min-h-screen bg-gray-50">
    <el-header class="bg-primary-800 text-white shadow-md px-6">
      <div class="flex items-center justify-between h-full">
        <div class="flex items-center space-x-4">
          <el-icon :size="32" class="text-white">
            <Tools />
          </el-icon>
          <h1 class="text-xl font-bold">物业报修系统 - 维修端</h1>
        </div>
        <div class="flex items-center space-x-6">
          <el-menu
            mode="horizontal"
            :default-active="activeMenu"
            background-color="#1e40af"
            text-color="#ffffff"
            active-text-color="#60a5fa"
            router
            class="border-none"
          >
            <el-menu-item index="/staff">
              <el-badge :value="pendingCount" :hidden="!pendingCount">
                <el-icon><Clock /></el-icon>
                <span>待处理</span>
              </el-badge>
            </el-menu-item>
            <el-menu-item index="/staff?status=processing">
              <el-badge :value="processingCount" :hidden="!processingCount">
                <el-icon><Loading /></el-icon>
                <span>处理中</span>
              </el-badge>
            </el-menu-item>
            <el-menu-item index="/staff?status=completed">
              <el-icon><CircleCheck /></el-icon>
              <span>已完成</span>
            </el-menu-item>
          </el-menu>
          <el-dropdown @command="handleCommand">
            <div class="flex items-center space-x-2 cursor-pointer hover:bg-primary-700 px-3 py-2 rounded-lg transition-colors">
              <el-avatar :size="32" class="bg-primary-500">
                {{ userStore.user?.name?.charAt(0) || 'S' }}
              </el-avatar>
              <span class="hidden md:inline">{{ userStore.user?.name }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <div class="text-sm">
                    <div class="font-medium">{{ userStore.user?.name }}</div>
                    <div class="text-gray-500 text-xs">工号：{{ userStore.user?.workNo }}</div>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>
    <el-container>
      <el-aside
        :width="sidebarCollapsed ? '64px' : '240px'"
        class="bg-white shadow-sm transition-all duration-300 hidden md:block"
      >
        <div class="p-4 border-b">
          <el-button
            type="text"
            @click="sidebarCollapsed = !sidebarCollapsed"
            class="w-full flex justify-center"
          >
            <el-icon :size="20">
              <Expand v-if="sidebarCollapsed" />
              <Fold v-else />
            </el-icon>
          </el-button>
        </div>
        <div class="p-4">
          <div v-if="!sidebarCollapsed" class="space-y-4">
            <div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white">
              <div class="text-sm opacity-90 mb-1">今日待处理</div>
              <div class="text-3xl font-bold">{{ pendingCount }}</div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-orange-50 rounded-lg p-3 text-center">
                <div class="text-orange-600 text-2xl font-bold">{{ processingCount }}</div>
                <div class="text-xs text-orange-500">处理中</div>
              </div>
              <div class="bg-green-50 rounded-lg p-3 text-center">
                <div class="text-green-600 text-2xl font-bold">{{ completedCount }}</div>
                <div class="text-xs text-green-500">已完成</div>
              </div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-sm text-gray-600 mb-2">我的信息</div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">姓名</span>
                  <span class="font-medium">{{ userStore.user?.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">工号</span>
                  <span class="font-medium">{{ userStore.user?.workNo }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center space-y-4">
            <div class="relative">
              <el-button type="primary" circle @click="$router.push('/staff')">
                <el-icon><Clock /></el-icon>
              </el-button>
              <el-badge
                :value="pendingCount"
                :hidden="!pendingCount"
                class="absolute -top-1 -right-1"
              />
            </div>
            <el-tooltip :content="`工号: ${userStore.user?.workNo || ''}`" placement="right">
              <el-avatar :size="32" class="bg-primary-500">
                {{ userStore.user?.name?.charAt(0) || 'S' }}
              </el-avatar>
            </el-tooltip>
          </div>
        </div>
      </el-aside>
      <el-main class="p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const sidebarCollapsed = ref(false)
const pendingCount = ref(0)
const processingCount = ref(0)
const completedCount = ref(0)

const activeMenu = computed(() => {
  const status = route.query.status
  if (status === 'processing') return '/staff?status=processing'
  if (status === 'completed') return '/staff?status=completed'
  return '/staff'
})

async function handleCommand(command: string) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      userStore.logout()
      ElMessage.success('退出登录成功')
      router.push('/login')
    } catch {
    }
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.el-menu--horizontal) {
  border-bottom: none;
  height: 100%;
}

:deep(.el-menu--horizontal .el-menu-item) {
  height: 60px;
  line-height: 60px;
}

:deep(.el-badge__content) {
  text-indent: 0;
}
</style>
