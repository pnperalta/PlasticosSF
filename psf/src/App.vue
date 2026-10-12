<script setup>
// node src/serverSQL.js

import { onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const modoOscuro = ref(false)

function cerrarSesion() {
  auth.logout()
  router.push('/login')
}

watch(modoOscuro, (activo) => {
  document.documentElement.classList.toggle('dark', activo)
  document.documentElement.setAttribute('data-bs-theme', activo ? 'dark' : 'light')
  localStorage.setItem('tema', activo ? 'oscuro' : 'claro')
})

onMounted(() => {
  const temaGuardado = localStorage.getItem('tema')
  modoOscuro.value = temaGuardado === 'oscuro'
  document.documentElement.classList.toggle('dark', modoOscuro.value)
})

watch(modoOscuro, (activo) => {
  document.documentElement.classList.toggle('dark', activo)
  localStorage.setItem('tema', activo ? 'oscuro' : 'claro')
})
</script>

<template>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

  <div class="app-layout" :class="{ 'sin-sidebar': !auth.isAuthenticated }">
    <header class="no-print">
      <img alt="Vue logo" src="./assets/logopsf.png"/>
      <div class="modo_osc_cla">
        <i
          class="bi bi-brightness-high-fill"
          :class="{ activo: !modoOscuro }"
          title="Tema claro"
          @click="modoOscuro = false"
        ></i>
        <i
          class="bi bi-moon-fill"
          :class="{ activo: modoOscuro }"
          title="Tema oscuro"
          @click="modoOscuro = true"
        ></i>
      </div>
      <nav>
        <RouterLink to="/" class="tab">
          <i class="bi bi-receipt"></i>
          <span>Comanda</span>
        </RouterLink>
        <RouterLink to="/clientes" class="tab">
          <i class="bi bi-person-lines-fill"></i>
          <span>Clientes</span>
        </RouterLink>
        <RouterLink to="/produ" class="tab">
          <i class="bi bi-box-seam"></i>
          <span>Productos</span>
        </RouterLink>
        <RouterLink to="/calcu" class="tab">
          <i class="bi bi-calculator-fill"></i>
          <span>Calculadora</span>
        </RouterLink>
      </nav>

    </header>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  align-items: stretch;
}

header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 220px;
  flex-shrink: 0;
  background-color: var(--color-fondo-header);
  border-right: 1px solid var(--color-borde);
  box-shadow: var(--sombra);
  padding: 1rem 0;
  transition: background-color 0.2s, border-color 0.2s;
}

img {
  width: 95%;
  height: auto;
  margin: 0 auto 1rem auto;
}

.modo_osc_cla {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding-bottom: 1rem;
}

.modo_osc_cla i {
  font-size: 1.2rem;
  color: var(--color-borde);
  cursor: pointer;
  transition: color 0.15s, transform 0.15s;
}

.modo_osc_cla i:hover {
  transform: scale(1.15);
}

.modo_osc_cla i.activo {
  color: var(--color-acento);
}

nav {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.tab {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 1.2rem;
  color: var(--color-texto-suave);
  text-decoration: none;
  font-size: 0.95rem;
  border-left: 3px solid transparent;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.tab i {
  font-size: 1.2rem;
  color: var(--color-acento);
  width: 1.2rem;
  text-align: center;
}

.tab:hover {
  background-color: var(--color-fondo-hover);
  color: var(--color-acento-hover);
}

.tab.router-link-active {
  color: var(--color-acento-hover);
  border-left-color: var(--color-acento-hover);
  background-color: var(--color-fondo-hover);
  font-weight: 600;
}

.app-content {
  flex: 1;
  min-width: 0;
}

.app-layout.sin-sidebar {
  align-items: stretch;
}

.user-box {
  margin-top: auto;
  padding: 1rem 1.2rem 0 1.2rem;
  border-top: 1px solid var(--color-borde-suave);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}

.user-info i {
  font-size: 1.6rem;
  color: var(--color-acento);
}

.user-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-texto);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 0.75rem;
  color: var(--color-texto-muted);
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.8rem;
  background-color: transparent;
  border: 1px solid var(--color-borde-suave);
  border-radius: 6px;
  color: var(--color-texto-suave);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.logout-btn:hover {
  background-color: var(--color-fondo-hover);
  color: var(--color-acento-hover);
  border-color: var(--color-acento-hover);
}

@media print {
  .no-print {
    display: none !important;
  }

  .app-layout {
    display: block !important;
  }
}
</style>