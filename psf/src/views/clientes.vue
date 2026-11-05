<script setup>
// node src/serverSQL.js

import { ref, reactive, computed } from 'vue'
import { API_URL } from '@/config.js'

const clientes = ref([])
const mostrandoClientes = ref(false)
const mostrandoFormulario = ref(false)
const cargando = ref(false)
const editandoCliente = ref(null) // guarda { codigoc, etiquetas } de la fila en edición
const edicionCliente = reactive({ razonsocial: '', vendedor: '', etiquetas: '' })
const busqueda = ref('')

const clientesFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()
  if (!termino) return clientes.value

  return clientes.value.filter(c => {
    return (
      String(c.codigoc ?? '').toLowerCase().includes(termino) ||
      String(c.razonsocial ?? '').toLowerCase().includes(termino) ||
      String(c.etiquetas ?? '').toLowerCase().includes(termino) ||
      String(c.vendedor ?? '').toLowerCase().includes(termino)
    )
  })
})

function empezarEdicionCliente(c) {
  editandoCliente.value = { codigoc: c.codigoc, etiquetas: c.etiquetas }
  edicionCliente.razonsocial = c.razonsocial
  edicionCliente.vendedor = c.vendedor
  edicionCliente.etiquetas = c.etiquetas
}

function cancelarEdicionCliente() {
  editandoCliente.value = null
}

function esFilaEnEdicion(c) {
  return editandoCliente.value
    && editandoCliente.value.codigoc === c.codigoc
    && editandoCliente.value.etiquetas === c.etiquetas
}

async function guardarEdicionCliente() {
  const { codigoc, etiquetas } = editandoCliente.value // etiqueta VIEJA (para ubicar la fila)
  cargando.value = true
  try {
    const res = await fetch(`${API_URL}/clientes/${codigoc}/${etiquetas}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razonsocial: edicionCliente.razonsocial,
        vendedor: edicionCliente.vendedor,
        nuevaEtiqueta: edicionCliente.etiquetas // etiqueta NUEVA
      })
    })

    if (!res.ok) throw new Error('Error al actualizar el cliente')

    const cli = clientes.value.find(c => c.codigoc === codigoc && c.etiquetas === etiquetas)
    if (cli) {
      cli.razonsocial = edicionCliente.razonsocial
      cli.vendedor = edicionCliente.vendedor
      cli.etiquetas = edicionCliente.etiquetas
    }

    editandoCliente.value = null
    alert('Cliente actualizado correctamente.')
  } catch (err) {
    console.error(err)
    alert('Hubo un error al actualizar el cliente.')
  } finally {
    cargando.value = false
  }
}

const nuevoCliente = reactive({
  codigoc: '',
  razonsocial: '',
  etiquetas: '',
  vendedor: '',
})

async function toggleMostrarClientes() {
  if (mostrandoClientes.value) {
    mostrandoClientes.value = false
    return
  }

  cargando.value = true

  try {
    const res = await fetch(`${API_URL}/clientes`)

    if (!res.ok) throw new Error('Error al obtener los clientes')

    clientes.value = await res.json()
    mostrandoClientes.value = true
  } catch (err) {
    console.error(err)
    alert('Hubo un error al cargar los clientes.')
  } finally {
    cargando.value = false
  }
}

function toggleFormulario() {
  mostrandoFormulario.value = !mostrandoFormulario.value
}

async function agregarCliente() {
  if (!nuevoCliente.codigoc || !nuevoCliente.razonsocial || !nuevoCliente.etiquetas || !nuevoCliente.vendedor) {
    alert('Completá todos los campos')
    return
  }

  cargando.value = true

  try {
    const res = await fetch(`${API_URL}/clientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...nuevoCliente })
  })
    if (!res.ok) throw new Error('Error al guardar el cliente')

    await res.json()

    nuevoCliente.codigoc = ''
    nuevoCliente.razonsocial = ''
    nuevoCliente.etiquetas = ''
    nuevoCliente.vendedor = ''
 
    mostrandoFormulario.value = false
    alert('Cliente agregado correctamente.')

    if (mostrandoClientes.value) {
      await toggleMostrarClientes()
      await toggleMostrarClientes()
    }
  } catch (err) {
    console.error(err)
    alert('Hubo un error al agregar el cliente.')
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="clientes-app">
    <header class="app-header">
      <h1 class="titulo-principal" style="margin-top: 1%;">Clientes</h1>
    </header>

    <div class="toolbar">
      <button class="btn btn-primary" @click="toggleFormulario">
        {{ mostrandoFormulario ? 'Cancelar' : '+ Agregar cliente' }}
      </button>
      <button class="btn btn-outline" @click="toggleMostrarClientes">
        {{ mostrandoClientes ? 'Ocultar clientes' : 'Mostrar clientes' }}
      </button>
    </div>

    <transition name="fade">
      <div v-if="mostrandoFormulario" class="card form-card">
        <h2 class="card-title">Nuevo cliente</h2>
        <form @submit.prevent="agregarCliente" class="form-grid">
      <div class="field">
        <label for="codigoc">Código</label>
        <input type="text" id="codigoc" :value="nuevoCliente.codigoc"
          @input="nuevoCliente.codigoc = $event.target.value.toUpperCase()"
          placeholder="Ej. CL-1042">
      </div>

      <div class="field">
        <label for="razonsocial">Razón social</label>
        <input type="text" id="razonsocial" :value="nuevoCliente.razonsocial"
          @input="nuevoCliente.razonsocial = $event.target.value.toUpperCase()"
          placeholder="Ej. Acme S.A.">
      </div>

      <div class="field">
        <label for="etiqueta">Etiqueta</label>
        <input type="text" id="etiqueta" :value="nuevoCliente.etiquetas"
          @input="nuevoCliente.etiquetas = $event.target.value.toUpperCase()"
          placeholder="Ej. Mayorista">
      </div>

      <div class="field">
        <label for="vendedor">Vendedor</label>
        <input type="text" id="vendedor" :value="nuevoCliente.vendedor"
          @input="nuevoCliente.vendedor = $event.target.value.toUpperCase()"
          placeholder="Ej. Juan Pérez">
      </div>

          <button class="btn btn-primary form-submit" type="submit" :disabled="cargando">
            {{ cargando ? 'Guardando…' : 'Guardar cliente' }}
          </button>
        </form>
      </div>
    </transition>

    <div class="panel">
      <p v-if="cargando" class="state-msg">Cargando…</p>

      <div v-else-if="mostrandoClientes">
        <div class="search-bar">
          <input type="text" v-model="busqueda" placeholder="Buscar..." class="search-input">
          <button v-if="busqueda" class="btn btn-sm btn-ghost" @click="busqueda = ''" type="button">
            Limpiar
          </button>
        </div>

        <div v-if="clientes.length === 0" class="empty-state">
          <p>No hay clientes registrados todavía.</p>
        </div>

        <div v-else-if="clientesFiltrados.length === 0" class="empty-state">
          <p>No se encontraron clientes que coincidan con "{{ busqueda }}".</p>
        </div>

        <div v-else class="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Razón social</th>
                <th>Etiqueta</th>
                <th>Vendedor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in clientesFiltrados" :key="c.codigoc + '-' + c.etiquetas">
                <td><span class="code-chip">{{ c.codigoc }}</span></td>

          <template v-if="esFilaEnEdicion(c)">
            <td><input type="text" :value="edicionCliente.razonsocial"
              @input="edicionCliente.razonsocial = $event.target.value.toUpperCase()"></td>
            <td><input type="text" :value="edicionCliente.etiquetas"
              @input="edicionCliente.etiquetas = $event.target.value.toUpperCase()"></td>
            <td><input type="text" :value="edicionCliente.vendedor"
              @input="edicionCliente.vendedor = $event.target.value.toUpperCase()"></td>
            <td class="actions-cell">
              <button @click="guardarEdicionCliente" class="btn btn-sm btn-primary">Guardar</button>
              <button @click="cancelarEdicionCliente" class="btn btn-sm btn-ghost">Cancelar</button>
            </td>
          </template>

                <template v-else>
                  <td>{{ c.razonsocial }}</td>
                  <td>{{ c.etiquetas }}</td>
                  <td>{{ c.vendedor }}</td>
                  <td class="actions-cell">
                    <button class="btn btn-sm btn-outline" @click="empezarEdicionCliente(c)">Editar</button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>Presioná "Mostrar clientes" para ver la lista.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');

.clientes-app {
  --ink: #221f1e;
  --ink-soft: #6e6360;
  --surface: #ffffff;
  --bg: #f2efee;
  --line: #ddd6d4;
  --accent: #c1272d;
  --accent-dark: #8c1b1f;
  --accent-soft: #f7e6e5;
  --danger: #8c1b1f;
  --danger-soft: #f7e6e5;
  --radius: 10px;
  --shadow: 0 1px 2px rgba(34, 31, 30, 0.07), 0 10px 30px -14px rgba(34, 31, 30, 0.26);
  --font-display: 'Barlow Semi Condensed', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  font-family: var(--font-body);
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
  padding-bottom: 3rem;
}

html.dark .clientes-app {
  --ink: #d6d6d6;
  --ink-soft: #a4a4a4;
  --surface: #1e1e1e;
  --bg: #141414;
  --line: #333333;
  --accent: #ff6b6b;
  --accent-dark: #ff8787;
  --accent-soft: #3a1f1f;
  --danger: #ff8787;
  --danger-soft: #3a1f1f;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 10px 30px -14px rgba(0, 0, 0, 0.6);
}

.clientes-app * {
  box-sizing: border-box;
}

.titulo-principal {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: clamp(2.1rem, 5vw, 3rem);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink);
  margin: 0;
  padding-bottom: 0.7rem;
  position: relative;
}

.titulo-principal::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 4.5rem;
  height: 0.3rem;
  border-radius: 999px;
  background: var(--accent);
}

/* Header */

.app-header {
  text-align: center;
  padding: 3rem 1.5rem 1.75rem;
}

.eyebrow {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-dark);
  margin: 0 0 0.4rem;
}

.app-header h1 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2rem, 4vw, 2.75rem);
  letter-spacing: 0.01em;
  margin: 0;
  color: var(--ink);
}

/* Toolbar */

.toolbar {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0 1.5rem 0.5rem;
}

/* Buttons */

.btn {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  font-size: 0.92rem;
  padding: 0.7rem 1.4rem;
  border-radius: 8px;
  border: 1.5px solid transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: var(--accent);
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-dark);
  transform: translateY(-1px);
}

.btn-outline {
  background: var(--surface);
  border-color: var(--line);
  color: var(--ink);
}

.btn-outline:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent-dark);
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--ink-soft);
}

.btn-ghost:hover:not(:disabled) {
  color: var(--danger);
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
}

.btn:focus-visible,
input:focus-visible {
  outline: 3px solid var(--accent-dark);
  outline-offset: 2px;
}

/* Cards */

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.form-card {
  max-width: 640px;
  margin: 1.75rem auto 0;
  padding: 1.75rem 2rem;
}

.card-title {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--line);
}

/* Form */

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-soft);
  margin: 0;
}

input {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  margin: 0;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.form-submit {
  grid-column: 1 / -1;
  justify-self: start;
  margin-top: 0.4rem;
}

/* Panel / states */

.panel {
  max-width: 1100px;
  margin: 2.25rem auto 0;
  padding: 0 1.5rem;
}

.state-msg {
  text-align: center;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.85rem;
  color: var(--ink-soft);
  padding: 2rem 0;
}

.empty-state {
  text-align: center;
  padding: 3.5rem 1.5rem;
  color: var(--ink-soft);
  background: var(--surface);
  border: 1.5px dashed var(--line);
  border-radius: var(--radius);
  font-size: 1rem;
}

.empty-state p {
  margin: 0;
}

/* Table */

.table-wrap {
  overflow-x: auto;
  overflow-y: hidden;
}

table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-family: var(--font-body);
}

thead th {
  background: var(--ink);
  color: var(--surface);
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  font-size: 0.8rem;
  text-align: left;
  padding: 0.9rem 1.1rem;
  position: sticky;
  top: 0;
}

tbody td {
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--line);
  font-size: 0.92rem;
  color: var(--ink);
}

tbody tr:nth-child(even) {
  background: var(--bg);
}

tbody tr:hover {
  background: var(--accent-soft);
}

tbody tr:last-child td {
  border-bottom: none;
}

.code-chip {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--accent-dark);
  background: var(--accent-soft);
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  letter-spacing: 0.02em;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

td input {
  font-size: 0.88rem;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
}

/* Transitions */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Responsive */

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-card {
    padding: 1.25rem;
    margin: 1.5rem 1rem 0;
  }

  .panel {
    padding: 0 1rem;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 0 1.5rem 0.5rem;
  }

  .btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .clientes-app *,
  .clientes-app *::before,
  .clientes-app *::after {
    transition: none !important;
    animation: none !important;
  }
}

.search-bar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.search-input {
  width: 50%;
  justify-self: center;
}
</style>