import { createRouter, createWebHistory } from 'vue-router'
import Comanda from '@/views/comanda.vue'
import Produ from '@/views/produ.vue'
import Clientes from '@/views/clientes.vue'
import calculadora from '@/views/calculadora.vue'
import historialpdf from '@/views/historialpdf.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'comanda',
      component: Comanda,
    },
    {
      path: '/produ',
      name: 'produ',
      component: Produ,
    },
    {
      path: '/clientes',
      name: 'clientes',
      component: Clientes,
    },
    {
      path: '/calcu',
      name: 'calcu',
      component: calculadora,
    },
    {
      path: '/historial',
      name: 'historial',
      component: historialpdf,
    },
  ],
})

export default router