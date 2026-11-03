<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_URL } from '@/config.js'

const cargando = ref(false)
const error = ref('')
const pdfs = ref([])
const busqueda = ref('')

const filtrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return q ? pdfs.value.filter((p) => p.nombre.toLowerCase().includes(q)) : pdfs.value
})

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_URL}/comandas/pdfs`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Error ${res.status}: no se pudo cargar el historial`)
    }
    pdfs.value = await res.json()
  } catch (err) {
    error.value = err.message || 'No se pudo cargar el historial de comandas.'
  } finally {
    cargando.value = false
  }
}

function abrirPdf(nombre) {
  window.open(`${API_URL}/comandas/pdfs/${encodeURIComponent(nombre)}`, '_blank')
}

function obtenerUrlDescarga(nombre) {
  return `${API_URL}/comandas/pdfs/${encodeURIComponent(nombre)}`
}

function formatoFecha(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatoTamano(bytes) {
  if (!bytes) return '0 KB'
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

onMounted(() => {
  cargar()
})
</script>

<template>
  <div class="historial-app">
    <header class="historial-header">
      <div class="header-contenido">
        <h1 class="titulo-principal">
          <i class="bi bi-clock-history"></i> Historial de Comandas
        </h1>
        <p class="subtitulo">Comprobantes y comandas respaldadas en formato PDF</p>
      </div>

      <div class="header-acciones">
        <button
          type="button"
          class="btn-actualizar"
          :disabled="cargando"
          @click="cargar"
          title="Actualizar listado"
        >
          <i class="bi bi-arrow-clockwise" :class="{ 'icono-girando': cargando }"></i>
          <span>{{ cargando ? 'Cargando...' : 'Actualizar' }}</span>
        </button>
      </div>
    </header>

    <section class="toolbar-card">
      <div class="busqueda-wrapper">
        <i class="bi bi-search icono-buscar"></i>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar por nombre o número de comanda..."
          class="input-busqueda"
        />
        <button
          v-if="busqueda"
          type="button"
          class="btn-limpiar"
          @click="busqueda = ''"
          title="Limpiar búsqueda"
        >
          <i class="bi bi-x-circle-fill"></i>
        </button>
      </div>

      <div class="resumen-contador">
        <span v-if="busqueda && pdfs.length > 0">
          Mostrando <strong>{{ filtrados.length }}</strong> de <strong>{{ pdfs.length }}</strong>
        </span>
        <span v-else>
          Total: <strong>{{ pdfs.length }}</strong> {{ pdfs.length === 1 ? 'comanda' : 'comandas' }}
        </span>
      </div>
    </section>

    <!-- Estado: Cargando -->
    <div v-if="cargando && pdfs.length === 0" class="mensaje-estado">
      <div class="spinner-border text-danger" role="status"></div>
      <p>Cargando comandas en PDF...</p>
    </div>

    <!-- Estado: Error -->
    <div v-else-if="error" class="mensaje-error">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <p>{{ error }}</p>
      <button type="button" class="btn-reintentar" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: Sin registros -->
    <div v-else-if="pdfs.length === 0" class="mensaje-vacio">
      <i class="bi bi-folder2-open"></i>
      <h3>No hay PDFs guardados todavía</h3>
      <p>Cuando guardes comandas desde el panel principal, aparecerán aquí para consultarlas o descargarlas.</p>
    </div>

    <!-- Estado: Sin coincidencias con el filtro -->
    <div v-else-if="filtrados.length === 0" class="mensaje-vacio">
      <i class="bi bi-search"></i>
      <h3>Sin coincidencias</h3>
      <p>No se encontraron comandas que coincidan con "<strong>{{ busqueda }}</strong>".</p>
    </div>

    <!-- Tabla de resultados -->
    <div v-else class="tabla-contenedor">
      <table class="tabla-historial">
        <thead>
          <tr>
            <th class="col-icono">Tipo</th>
            <th>Nombre del archivo</th>
            <th>Fecha de guardado</th>
            <th>Tamaño</th>
            <th class="col-acciones text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pdf in filtrados" :key="pdf.nombre" class="fila-comanda">
            <td class="col-icono">
              <i class="bi bi-file-earmark-pdf-fill icono-pdf"></i>
            </td>
            <td class="col-nombre">
              <span class="nombre-archivo" :title="pdf.nombre">{{ pdf.nombre }}</span>
            </td>
            <td class="col-fecha">
              <i class="bi bi-calendar3 me-1"></i>
              {{ formatoFecha(pdf.fecha) }}
            </td>
            <td class="col-tamano">
              <span class="badge-tamano">{{ formatoTamano(pdf.tamano) }}</span>
            </td>
            <td class="col-acciones text-end">
              <button
                type="button"
                class="btn-accion btn-ver"
                @click="abrirPdf(pdf.nombre)"
                title="Abrir PDF en pestaña nueva"
              >
                <i class="bi bi-box-arrow-up-right"></i>
                <span>Ver</span>
              </button>
              <a
                :href="obtenerUrlDescarga(pdf.nombre)"
                :download="pdf.nombre"
                class="btn-accion btn-descargar"
                title="Descargar archivo PDF"
              >
                <i class="bi bi-download"></i>
                <span>Descargar</span>
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.historial-app {
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-borde);
}

.titulo-principal {
  font-size: 1.85rem;
  font-weight: 700;
  color: var(--color-texto);
  margin: 0 0 0.3rem 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.titulo-principal i {
  color: var(--color-acento);
}

.subtitulo {
  font-size: 0.95rem;
  color: var(--color-texto-muted);
  margin: 0;
}

.btn-actualizar {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  background: var(--color-fondo-panel);
  color: var(--color-texto);
  border: 1px solid var(--color-borde);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-actualizar:hover:not(:disabled) {
  border-color: var(--color-acento);
  color: var(--color-acento);
  background: var(--color-fondo-hover);
}

.btn-actualizar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icono-girando {
  animation: rotar 1s linear infinite;
}

@keyframes rotar {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.toolbar-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: var(--color-fondo-panel);
  border: 1px solid var(--color-borde);
  border-radius: 10px;
  padding: 0.85rem 1.2rem;
  margin-bottom: 1.5rem;
}

.busqueda-wrapper {
  position: relative;
  flex: 1;
  min-width: 260px;
  max-width: 460px;
  display: flex;
  align-items: center;
}

.icono-buscar {
  position: absolute;
  left: 0.85rem;
  color: var(--color-texto-muted);
  font-size: 0.95rem;
}

.input-busqueda {
  width: 100%;
  padding: 0.5rem 2.2rem 0.5rem 2.4rem;
  background: var(--color-fondo);
  color: var(--color-texto);
  border: 1px solid var(--color-borde-suave);
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s ease;
}

.input-busqueda:focus {
  border-color: var(--color-acento);
}

.btn-limpiar {
  position: absolute;
  right: 0.6rem;
  background: transparent;
  border: 0;
  color: var(--color-texto-muted);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}

.btn-limpiar:hover {
  color: var(--color-acento);
}

.resumen-contador {
  font-size: 0.9rem;
  color: var(--color-texto-suave);
}

.tabla-contenedor {
  background: var(--color-fondo-panel);
  border: 1px solid var(--color-borde);
  border-radius: 10px;
  overflow-x: auto;
  box-shadow: var(--sombra);
}

.tabla-historial {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.tabla-historial thead {
  background: var(--color-fondo);
  border-bottom: 2px solid var(--color-borde);
}

.tabla-historial th {
  padding: 0.85rem 1rem;
  text-align: left;
  font-weight: 700;
  color: var(--color-texto-suave);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tabla-historial td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-borde-suave);
  vertical-align: middle;
  color: var(--color-texto);
}

.fila-comanda:hover {
  background: var(--color-fondo-hover);
}

.col-icono {
  width: 48px;
  text-align: center;
}

.icono-pdf {
  font-size: 1.4rem;
  color: var(--color-acento);
}

.col-nombre {
  font-weight: 600;
}

.nombre-archivo {
  word-break: break-all;
}

.col-fecha {
  color: var(--color-texto-suave);
  font-size: 0.88rem;
  white-space: nowrap;
}

.col-tamano {
  white-space: nowrap;
}

.badge-tamano {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  background: var(--color-fondo);
  border: 1px solid var(--color-borde-suave);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--color-texto-suave);
  font-family: monospace;
}

.col-acciones {
  white-space: nowrap;
}

.btn-accion {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  margin-left: 0.4rem;
}

.btn-ver {
  background: var(--color-acento);
  color: #ffffff;
}

.btn-ver:hover {
  background: var(--color-acento-hover);
  color: #ffffff;
}

.btn-descargar {
  background: transparent;
  border-color: var(--color-borde);
  color: var(--color-texto);
}

.btn-descargar:hover {
  background: var(--color-fondo-panel);
  border-color: var(--color-acento);
  color: var(--color-acento);
}

.mensaje-estado,
.mensaje-error,
.mensaje-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 1.5rem;
  text-align: center;
  background: var(--color-fondo-panel);
  border: 1px solid var(--color-borde);
  border-radius: 10px;
  color: var(--color-texto-muted);
}

.mensaje-estado p {
  margin-top: 1rem;
  font-size: 0.95rem;
}

.mensaje-error {
  border-color: #e57373;
}

.mensaje-error i {
  font-size: 2.2rem;
  color: #d32f2f;
  margin-bottom: 0.5rem;
}

.mensaje-error p {
  color: #d32f2f;
  margin-bottom: 1rem;
  font-weight: 600;
}

.btn-reintentar {
  padding: 0.45rem 1rem;
  background: var(--color-acento);
  color: white;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.mensaje-vacio i {
  font-size: 2.6rem;
  color: var(--color-texto-muted);
  margin-bottom: 0.6rem;
}

.mensaje-vacio h3 {
  font-size: 1.15rem;
  color: var(--color-texto);
  margin: 0 0 0.3rem 0;
}

.mensaje-vacio p {
  font-size: 0.9rem;
  max-width: 420px;
  margin: 0;
}
</style>
