// node src/serverSQL.js

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import os from 'os';
import authRoutes from '../routes/auth.js';
import usuariosRoutes from '../routes/usuarios.js';
 
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Conexión usando variables de entorno
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

const BACKUP_DIR = path.join(os.homedir(), 'Desktop', 'ComandasBackup');
await fs.mkdir(BACKUP_DIR, { recursive: true });

const PDF_DIR = path.join(os.homedir(), 'Documents', 'ComandasPDF');
await fs.mkdir(PDF_DIR, { recursive: true });

const upload = multer({ dest: PDF_DIR });

app.get('/usuarios', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, usuario, rol, activo FROM usuarios');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

app.get('/productospsf/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const [rows] = await pool.query('SELECT * FROM productospsf WHERE codigop = ?', [codigo]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el producto' });
    }
});

app.post('/productospsf', async (req, res) => {
    try {
        const { codigop, tipo, medida, peso } = req.body;   // 👈 agregado codigop
        const querySQL = 'INSERT INTO productospsf (codigop, tipo, medida, peso) VALUES (?, ?, ?, ?)';
        const [resultado] = await pool.query(querySQL, [codigop, tipo, medida, peso]);
        res.status(201).json({ id: resultado.insertId, codigop, tipo, medida, peso });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al insertar el producto' });
    }
});

app.put('/productospsf/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const { tipo, medida, peso } = req.body;
        const querySQL = 'UPDATE productospsf SET tipo = ?, medida = ?, peso = ? WHERE codigop = ?';
        const [resultado] = await pool.query(querySQL, [tipo, medida, peso, codigo]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado para actualizar' });
        }
        res.json({ mensaje: 'Producto actualizado correctamente en MySQL' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
});

app.delete('/productospsf/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await pool.query('DELETE FROM productospsf WHERE id = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'No se encontró el producto para eliminar' });
        }
        res.json({ mensaje: `Producto con ID ${id} eliminado de la base de datos` });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
});



// ==========================================

app.get('/productospsf', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM productospsf');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los productos' });
    }
});

app.get('/productospsf/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const [rows] = await pool.query('SELECT * FROM productospsf WHERE codigop = ?', [codigo]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el producto' });
    }
});

app.post('/productospsf', async (req, res) => {
    try {
        const { tipo, medida, peso } = req.body;
        const querySQL = 'INSERT INTO productospsf (tipo, medida, peso) VALUES (?, ?, ?)';
        const [resultado] = await pool.query(querySQL, [tipo, medida, peso]);
        res.status(201).json({ id: resultado.insertId, tipo, medida, peso });
    } catch (error) {
        res.status(500).json({ error: 'Error al insertar el producto' });
    }
});

app.put('/productospsf/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const { tipo, medida, peso } = req.body;
        const querySQL = 'UPDATE productospsf SET tipo = ?, medida = ?, peso = ? WHERE codigop = ?';
        const [resultado] = await pool.query(querySQL, [tipo, medida, peso, codigo]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado para actualizar' });
        }
        res.json({ mensaje: 'Producto actualizado correctamente en MySQL' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
});

app.delete('/productospsf/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await pool.query('DELETE FROM productospsf WHERE id = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'No se encontró el producto para eliminar' });
        }
        res.json({ mensaje: `Producto con ID ${id} eliminado de la base de datos` });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
});

app.get('/clientes', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clientespsf');
        res.json(rows);
    } catch (error) {
        console.error(error); // 👈 agregá esta línea
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
});

// Devuelve TODAS las filas de ese código de cliente (puede ser más de una)
app.get('/clientes/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const [rows] = await pool.query('SELECT * FROM clientespsf WHERE codigoc = ?', [codigo]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(rows); // ahora es un array, no rows[0]
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el cliente' });
    }
});

app.post('/clientes', async (req, res) => {
    try {
        const { codigoc, razonsocial, etiquetas, vendedor } = req.body;
        const querySQL = 'INSERT INTO clientespsf (codigoc, razonsocial, etiquetas, vendedor) VALUES (?, ?, ?, ?)';
        await pool.query(querySQL, [codigoc, razonsocial, etiquetas, vendedor]);
        res.status(201).json({ codigoc, razonsocial, etiquetas, vendedor });
    } catch (error) {
        // Si mandan el mismo codigoc + misma etiqueta que ya existe, MySQL va a rechazarlo
        res.status(500).json({ error: 'Error al insertar el cliente (¿código + etiqueta ya existen?)' });
    }
});

app.put('/clientes/:codigo/:etiqueta', async (req, res) => {
    try {
        const { codigo, etiqueta } = req.params; // etiqueta VIEJA, usada para encontrar la fila
        const { razonsocial, vendedor, nuevaEtiqueta } = req.body;
        const etiquetaFinal = nuevaEtiqueta || etiqueta; // si no mandan una nueva, deja la misma

        const querySQL = 'UPDATE clientespsf SET razonsocial = ?, vendedor = ?, etiquetas = ? WHERE codigoc = ? AND etiquetas = ?';
        const [resultado] = await pool.query(querySQL, [razonsocial, vendedor, etiquetaFinal, codigo, etiqueta]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado para actualizar' });
        }
        res.json({ mensaje: 'Cliente actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
});

app.delete('/clientes/:codigo/:etiqueta', async (req, res) => {
    try {
        const { codigo, etiqueta } = req.params;
        const [resultado] = await pool.query(
            'DELETE FROM clientespsf WHERE codigoc = ? AND etiquetas = ?',
            [codigo, etiqueta]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'No se encontró el cliente para eliminar' });
        }
        res.json({ mensaje: `Cliente ${codigo} (etiqueta ${etiqueta}) eliminado` });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el cliente' });
    }
});

// ==========================================
// COMANDAS: Crear una nueva (POST)
// ==========================================
app.post('/comandas', async (req, res) => {
    try {
        const { codc, vendedor, etiqueta, codp, cantidad } = req.body;
        const querySQL = 'INSERT INTO comandas (codc, vendedor, etiqueta, codp, cantidad) VALUES (?, ?, ?, ?, ?)';
        const [resultado] = await pool.query(querySQL, [codc, vendedor, etiqueta, codp, cantidad]);

        // Traemos la fila recién creada para devolver la fecha exacta que puso MySQL
        const [rows] = await pool.query('SELECT * FROM comandas WHERE id = ?', [resultado.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la comanda' });
    }
});

// ==========================================
// COMANDAS: Obtener todas (GET)
// ==========================================
app.get('/comandas', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM comandas ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las comandas' });
    }
});


app.get('/comandas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM comandas WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Comanda no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar la comanda' });
    }
});

app.post('/comandas/backup', async (req, res) => {
    try {
        const datos = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const numero = datos.numero || 'sin-numero';
        const nombreArchivo = `comanda-${numero}-${timestamp}.json`;

        await fs.writeFile(
            path.join(BACKUP_DIR, nombreArchivo),
            JSON.stringify(datos, null, 2),
            'utf-8'
        );

        res.status(201).json({ mensaje: 'Backup guardado', archivo: nombreArchivo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar el backup de la comanda' });
    }
});

app.post('/comandas/backup-pdf', upload.single('pdf'), async (req, res) => {
    try {
        const nombreFinal = path.join(PDF_DIR, req.file.originalname);
        await fs.rename(req.file.path, nombreFinal);
        res.status(201).json({ mensaje: 'PDF guardado', archivo: req.file.originalname });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar el PDF' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor con MySQL corriendo en http://localhost:${PORT}`);
});