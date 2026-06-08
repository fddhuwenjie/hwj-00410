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
        },
        {
          path: 'bills',
          name: 'OwnerBills',
          component: () => import('@/views/owner/Bills.vue')
        },
        {
          path: 'bill/:id',
          name: 'OwnerBillDetail',
          component: () => import('@/views/owner/BillDetail.vue')
        },
        {
          path: 'knowledge',
          name: 'OwnerKnowledge',
          component: () => import('@/views/owner/Knowledge.vue')
        },
        {
          path: 'knowledge/:id',
          name: 'OwnerKnowledgeDetail',
          component: () => import('@/views/owner/KnowledgeDetail.vue')
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
        },
        {
          path: 'bills',
          name: 'AdminBills',
          component: () => import('@/views/admin/Bills.vue')
        },
        {
          path: 'bills/:id',
          name: 'AdminBillDetail',
          component: () => import('@/views/owner/BillDetail.vue')
        },
        {
          path: 'revenue-report',
          name: 'AdminRevenueReport',
          component: () => import('@/views/admin/RevenueReport.vue')
        },
        {
          path: 'return-visits',
          name: 'AdminReturnVisits',
          component: () => import('@/views/admin/ReturnVisits.vue')
        },
        {
          path: 'return-visit-stats',
          name: 'AdminReturnVisitStats',
          component: () => import('@/views/admin/ReturnVisitStats.vue')
        },
        {
          path: 'knowledge',
          name: 'AdminKnowledge',
          component: () => import('@/views/admin/Knowledge.vue')
        },
        {
          path: 'knowledge-stats',
          name: 'AdminKnowledgeStats',
          component: () => import('@/views/admin/KnowledgeStats.vue')
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
