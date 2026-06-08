import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Login from '@/views/Login.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/owner',
      name: 'Owner',
      component: () => import('@/layouts/OwnerLayout.vue'),
      meta: { requiresAuth: true, role: 'owner' },
      children: [
        {
          path: '',
          name: 'OwnerHome',
          component: () => import('@/views/owner/Home.vue')
        },
        {
          path: 'submit',
          name: 'SubmitOrder',
          component: () => import('@/views/owner/SubmitOrder.vue')
        },
        {
          path: 'order/:id',
          name: 'OwnerOrderDetail',
          component: () => import('@/views/owner/OrderDetail.vue')
        },
        {
          path: 'announcements',
          name: 'OwnerAnnouncements',
          component: () => import('@/views/owner/Announcements.vue')
        }
      ]
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        {
          path: '',
          name: 'AdminDashboard',
          component: () => import('@/views/admin/Dashboard.vue')
        },
        {
          path: 'orders',
          name: 'AdminOrders',
          component: () => import('@/views/admin/Orders.vue')
        },
        {
          path: 'orders/:id',
          name: 'AdminOrderDetail',
          component: () => import('@/views/admin/OrderDetail.vue')
        },
        {
          path: 'staff',
          name: 'AdminStaff',
          component: () => import('@/views/admin/Staff.vue')
        },
        {
          path: 'announcements',
          name: 'AdminAnnouncements',
          component: () => import('@/views/admin/Announcements.vue')
        },
        {
          path: 'inspection-plans',
          name: 'AdminInspectionPlans',
          component: () => import('@/views/admin/InspectionPlans.vue')
        },
        {
          path: 'inspection-records',
          name: 'AdminInspectionRecords',
          component: () => import('@/views/admin/InspectionRecords.vue')
        },
        {
          path: 'materials',
          name: 'AdminMaterials',
          component: () => import('@/views/admin/Materials.vue')
        },
        {
          path: 'material-stats',
          name: 'AdminMaterialStats',
          component: () => import('@/views/admin/MaterialStats.vue')
        }
      ]
    },
    {
      path: '/staff',
      name: 'Staff',
      component: () => import('@/layouts/StaffLayout.vue'),
      meta: { requiresAuth: true, role: 'staff' },
      children: [
        {
          path: '',
          name: 'StaffHome',
          component: () => import('@/views/staff/Home.vue')
        },
        {
          path: 'orders/:id',
          name: 'StaffOrderDetail',
          component: () => import('@/views/staff/OrderDetail.vue')
        },
        {
          path: 'inspections',
          name: 'StaffInspections',
          component: () => import('@/views/staff/Inspections.vue')
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  userStore.initUser()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.role && userStore.user?.role !== to.meta.role) {
    const roleMap: Record<string, string> = {
      owner: '/owner',
      admin: '/admin',
      staff: '/staff'
    }
    next(roleMap[userStore.user?.role || ''] || '/login')
  } else {
    next()
  }
})

export default router
