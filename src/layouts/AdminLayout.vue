<template>
  <el-container class="min-h-screen bg-gray-50">
    <el-aside
      :width="sidebarCollapsed ? '64px' : '240px'"
      class="bg-primary-800 text-white transition-all duration-300 flex flex-col"
    >
      <div class="h-16 flex items-center justify-center border-b border-primary-700 px-4">
        <el-icon :size="32" class="text-white">
          <Setting />
        </el-icon>
        <h1 v-if="!sidebarCollapsed" class="text-lg font-bold ml-3 whitespace-nowrap">
          管理后台
        </h1>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        background-color="#1e40af"
        text-color="#ffffff"
        active-text-color="#60a5fa"
        router
        class="border-none flex-1"
      >
        <el-menu-item index="/admin">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
        <el-menu-item index="/admin/orders">
          <el-icon><List /></el-icon>
          <template #title>工单管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/staff">
          <el-icon><User /></el-icon>
          <template #title>维修人员</template>
        </el-menu-item>
        <el-menu-item index="/admin/announcements">
          <el-icon><Bell /></el-icon>
          <template #title>公告管理</template>
        </el-menu-item>
        <el-sub-menu index="inspection">
          <template #title>
            <el-icon><DataBoard /></el-icon>
            <span>巡检管理</span>
          </template>
          <el-menu-item index="/admin/inspection-plans">
            <el-icon><Document /></el-icon>
            <template #title>巡检计划</template>
          </el-menu-item>
          <el-menu-item index="/admin/inspection-records">
            <el-icon><Tickets /></el-icon>
            <template #title>巡检记录</template>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="materials">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>物料管理</span>
          </template>
          <el-menu-item index="/admin/materials">
            <el-icon><Goods /></el-icon>
            <template #title>库存管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/material-stats">
            <el-icon><TrendCharts /></el-icon>
            <template #title>消耗统计</template>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
      <div class="p-4 border-t border-primary-700">
        <el-button
          type="text"
          class="w-full flex justify-center text-white hover:bg-primary-700"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <el-icon :size="20">
            <Expand v-if="sidebarCollapsed" />
            <Fold v-else />
          </el-icon>
        </el-button>
      </div>
    </el-aside>
    <el-container class="flex flex-col">
      <el-header class="bg-white shadow-sm px-6 flex items-center justify-between">
        <div class="flex items-center">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="(item, index) in breadcrumbs"
              :key="index"
              :to="index === breadcrumbs.length - 1 ? undefined : item.path"
            >
              {{ item.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="flex items-center space-x-4">
          <el-tooltip content="通知">
            <el-badge :value="3" class="cursor-pointer">
              <el-button type="primary" :icon="Bell" circle plain />
            </el-badge>
          </el-tooltip>
          <el-dropdown @command="handleCommand">
            <div class="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
              <el-avatar :size="36" class="bg-primary-500">
                {{ userStore.user?.name?.charAt(0) || 'A' }}
              </el-avatar>
              <div class="hidden md:block">
                <div class="text-sm font-medium text-gray-800">{{ userStore.user?.name }}</div>
                <div class="text-xs text-gray-500">管理员</div>
              </div>
              <el-icon class="text-gray-400"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <div class="py-1">
                    <div class="font-medium text-gray-800">{{ userStore.user?.name }}</div>
                    <div class="text-gray-500 text-xs mt-1">管理员</div>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="profile">
                  <el-icon><User /></el-icon>
                  个人信息
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="p-6 flex-1">
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
import { Bell, User, SwitchButton, DataBoard, Document, Tickets, Box, Goods, TrendCharts } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const sidebarCollapsed = ref(false)

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/admin/inspection-')) {
    return '/admin/inspection-plans'
  }
  if (path.startsWith('/admin/material-') || path.startsWith('/admin/materials')) {
    return '/admin/materials'
  }
  return path
})

const breadcrumbMap: Record<string, { name: string; path: string }[]> = {
  '/admin': [{ name: '仪表盘', path: '/admin' }],
  '/admin/orders': [
    { name: '仪表盘', path: '/admin' },
    { name: '工单管理', path: '/admin/orders' }
  ],
  '/admin/staff': [
    { name: '仪表盘', path: '/admin' },
    { name: '维修人员', path: '/admin/staff' }
  ],
  '/admin/announcements': [
    { name: '仪表盘', path: '/admin' },
    { name: '公告管理', path: '/admin/announcements' }
  ],
  '/admin/inspection-plans': [
    { name: '仪表盘', path: '/admin' },
    { name: '巡检管理', path: '' },
    { name: '巡检计划', path: '/admin/inspection-plans' }
  ],
  '/admin/inspection-records': [
    { name: '仪表盘', path: '/admin' },
    { name: '巡检管理', path: '' },
    { name: '巡检记录', path: '/admin/inspection-records' }
  ],
  '/admin/materials': [
    { name: '仪表盘', path: '/admin' },
    { name: '物料管理', path: '' },
    { name: '库存管理', path: '/admin/materials' }
  ],
  '/admin/material-stats': [
    { name: '仪表盘', path: '/admin' },
    { name: '物料管理', path: '' },
    { name: '消耗统计', path: '/admin/material-stats' }
  ]
}

const breadcrumbs = computed(() => {
  const path = route.path
  if (path.startsWith('/admin/orders/')) {
    return [
      { name: '仪表盘', path: '/admin' },
      { name: '工单管理', path: '/admin/orders' },
      { name: '工单详情', path: '' }
    ]
  }
  return breadcrumbMap[path] || [{ name: '仪表盘', path: '/admin' }]
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
  } else if (command === 'profile') {
    ElMessage.info('个人信息功能开发中')
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

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}

:deep(.el-menu--collapse .el-menu-item) {
  justify-content: center;
  padding: 0 !important;
}
</style>
