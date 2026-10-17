import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { auth: true } },
    { path: '/face/enroll', name: 'enroll', component: () => import('@/views/FaceEnrollView.vue'), meta: { auth: true } },
    { path: '/face/compare', name: 'compare', component: () => import('@/views/FaceCompareView.vue'), meta: { auth: true } },
    { path: '/profile', name: 'profile', component: () => import('@/views/MilitaryProfileView.vue'), meta: { auth: true } },
    { path: '/settings/security', name: 'security', component: () => import('@/views/SecuritySettingsView.vue'), meta: { auth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()
  if (to.meta.auth && auth.state !== 'authenticated') return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && auth.state === 'authenticated') return { name: 'dashboard' }
})
