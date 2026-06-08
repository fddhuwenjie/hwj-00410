<template>
  <div class="min-h-screen bg-gray-50">
    <el-header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="h-full flex items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
            <el-icon :size="24" color="white"><Tools /></el-icon>
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-800">物业报修系统</h1>
            <p class="text-xs text-gray-500">业主端</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <el-button text @click="router.push('/owner/announcements')">
            <el-icon :size="20"><Bell /></el-icon>
          </el-button>
          <el-dropdown @command="handleCommand">
            <div class="flex items-center gap-2 cursor-pointer">
              <el-avatar :size="36" class="bg-blue-500">
                {{ userStore.user?.name?.charAt(0) || '业' }}
              </el-avatar>
              <div class="hidden sm:block">
                <p class="text-sm font-medium text-gray-800">{{ userStore.user?.name }}</p>
                <p class="text-xs text-gray-500">{{ userStore.user?.room }}</p>
              </div>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>

    <el-main class="pb-24">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>

    <footer class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 z-50">
      <div class="flex justify-around items-center">
        <div
          v-for="item in navItems"
          :key="item.path"
          class="flex flex-col items-center gap-1 cursor-pointer py-1 px-4 rounded-lg transition-colors"
          :class="{ 'text-blue-600': isActive(item.path) }"
          @click="router.push(item.path)"
        >
          <el-icon :size="22"><component :is="item.icon" /></el-icon>
          <span class="text-xs">{{ item.label }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { HomeFilled, Edit, Bell, ArrowDown, SwitchButton, Plus, Reading, Expand, Fold } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const navItems = [
  { path: '/owner', label: '首页', icon: HomeFilled },
  { path: '/owner/submit', label: '报修', icon: Edit },
  { path: '/owner/announcements', label: '公告', icon: Bell }
]

function isActive(path: string): boolean {
  if (path === '/owner') {
    return route.path === '/owner'
  }
  return route.path.startsWith(path)
}

function handleCommand(command: string) {
  if (command === 'logout') {
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}
</script>

<style scoped>
.el-header {
  height: 64px !important;
  padding: 0;
}

.el-main {
  padding: 16px;
}
</style>
