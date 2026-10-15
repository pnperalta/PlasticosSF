// node src/serverSQL.js

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import os from 'os';
import { fileURLToPath } from 'url';
import authRoutes from '../routes/auth.js';
import usuariosRoutes from '../routes/usuarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas auth y usuarios (compatibilidad)
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Health check para Docker / Coolify
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Conexión MySQL usando variables de entorno con fallbacks
export const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'psf',
    password: process.env.DB_PASSWORD || 'psf_password',
    database: process.env.DB_NAME || 'psf',
    waitForConnections: true,
    connectionLimit: 10
});

// Directorios para backups (configurables por variable de entorno)
const BACKUP_DIR = process.env.BACKUP_DIR || (process.env.NODE_ENV === 'production' ? path.resolve('./backups') : path.join(os.homedir(), 'Desktop', 'ComandasBackup'));
const PDF_DIR = process.env.PDF_DIR || (process.env.NODE_ENV === 'production' ? path.resolve('./backups-pdf') : path.join(os.homedir(), 'Documents', 'ComandasPDF'));

try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.mkdir(PDF_DIR, { recursive: true });
} catch (err) {
    console.warn('Advertencia al crear directorios de backup:', err.message);
}

const upload = multer({ dest: PDF_DIR });

// ==========================================
// USUARIOS
// ==========================================
app.get(['/usuarios', '/api/usuarios'], async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, usuario, rol, activo FROM usuarios');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

// ==========================================
// PRODUCTOS
// ==========================================
app.get(['/productospsf', '/api/productospsf'], async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM productospsf');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los productos' });
    }
});

app.get(['/productospsf/:codigo', '/api/productospsf/:codigo'], async (req, res) => {
    try {
        const { codigo } = req.params;
        const [rows] = await pool.query('SELECT * FROM productospsf WHERE codigop = ?', [codigo]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al buscar el producto' });
    }
});

app.post(['/productospsf', '/api/productospsf'], async (req, res) => {
    try {
        const { codigop, tipo, medida, peso } = req.body;
        const querySQL = 'INSERT INTO productospsf (codigop, tipo, medida, peso) VALUES (?, ?, ?, ?)';
        const [resultado] = await pool.query(querySQL, [codigop, tipo, medida, peso]);
        res.status(201).json({ id: resultado.insertId, codigop, tipo, medida, peso });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al insertar el producto' });
    }
});

app.put(['/productospsf/:codigo', '/api/productospsf/:codigo'], async (req, res) => {
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
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
});

app.delete(['/productospsf/:id', '/api/productospsf/:id'], async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await pool.query('DELETE FROM productospsf WHERE id = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'No se encontró el producto para eliminar' });
        }
        res.json({ mensaje: `Producto con ID ${id} eliminado de la base de datos` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
});

// ==========================================
// CLIENTES
// ==========================================
app.get(['/clientes', '/api/clientes'], async (req, res, next) => {
    // Si la petición viene desde la barra de direcciones solicitando HTML, dejar pasar al frontend SPA
    if (req.path === '/clientes' && req.headers.accept?.includes('text/html') && !req.headers.accept?.includes('application/json')) {
        return next();
    }
    try {
        const [rows] = await pool.query('SELECT * FROM clientespsf');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
});

app.get(['/clientes/:codigo', '/api/clientes/:codigo'], async (req, res) => {
    try {
        const { codigo } = req.params;
        const [rows] = await pool.query('SELECT * FROM clientespsf WHERE codigoc = ?', [codigo]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al buscar el cliente' });
    }
});

app.post(['/clientes', '/api/clientes'], async (req, res) => {
    try {
        const { codigoc, razonsocial, etiquetas, vendedor } = req.body;
        const querySQL = 'INSERT INTO clientespsf (codigoc, razonsocial, etiquetas, vendedor) VALUES (?, ?, ?, ?)';
        await pool.query(querySQL, [codigoc, razonsocial, etiquetas, vendedor]);
        res.status(201).json({ codigoc, razonsocial, etiquetas, vendedor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al insertar el cliente (¿código + etiqueta ya existen?)' });
    }
});

app.put(['/clientes/:codigo/:etiqueta', '/api/clientes/:codigo/:etiqueta'], async (req, res) => {
    try {
        const { codigo, etiqueta } = req.params;
        const { razonsocial, vendedor, nuevaEtiqueta } = req.body;
        const etiquetaFinal = nuevaEtiqueta || etiqueta;

        const querySQL = 'UPDATE clientespsf SET razonsocial = ?, vendedor = ?, etiquetas = ? WHERE codigoc = ? AND etiquetas = ?';
        const [resultado] = await pool.query(querySQL, [razonsocial, vendedor, etiquetaFinal, codigo, etiqueta]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado para actualizar' });
        }
        res.json({ mensaje: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
});

app.delete(['/clientes/:codigo/:etiqueta', '/api/clientes/:codigo/:etiqueta'], async (req, res) => {
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
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el cliente' });
    }
});

// ==========================================
// COMANDAS
// ==========================================
app.post(['/comandas', '/api/comandas'], async (req, res) => {
    try {
        const { codc, vendedor, etiqueta, codp, cantidad } = req.body;
        const querySQL = 'INSERT INTO comandas (codc, vendedor, etiqueta, codp, cantidad) VALUES (?, ?, ?, ?, ?)';
        const [resultado] = await pool.query(querySQL, [codc, vendedor, etiqueta, codp, cantidad]);

        const [rows] = await pool.query('SELECT * FROM comandas WHERE id = ?', [resultado.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar la comanda' });
    }
});

app.get(['/comandas', '/api/comandas'], async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM comandas ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las comandas' });
    }
});

app.get(['/comandas/:id', '/api/comandas/:id'], async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM comandas WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Comanda no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al buscar la comanda' });
    }
});

app.post(['/comandas/backup', '/api/comandas/backup'], async (req, res) => {
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

app.post(['/comandas/backup-pdf', '/api/comandas/backup-pdf'], upload.single('pdf'), async (req, res) => {
    try {
        const nombreFinal = path.join(PDF_DIR, req.file.originalname);
        await fs.rename(req.file.path, nombreFinal);
        res.status(201).json({ mensaje: 'PDF guardado', archivo: req.file.originalname });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar el PDF' });
    }
});

// ==========================================
// ARCHIVOS ESTÁTICOS Y ENRUTAMIENTO SPA
// ==========================================
app.use(express.static(distPath));

app.use((req, res, next) => {
    if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/productospsf') ||
        req.path.startsWith('/comandas') ||
        (req.path.startsWith('/clientes') && !req.headers.accept?.includes('text/html'))
    ) {
        return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) next();
    });
});

// ==========================================
// INICIALIZACIÓN Y CONEXIÓN DB CON REINTENTOS
// ==========================================
async function initDB() {
    let retries = 30;
    while (retries > 0) {
        try {
            const connection = await pool.getConnection();
            console.log('✅ Conexión con base de datos MySQL exitosa.');

            // Crear tablas auxiliares si no existen
            await connection.query(`
                CREATE TABLE IF NOT EXISTS clientespsf (
                    codigoc int(10) NOT NULL,
                    razonsocial varchar(50) NOT NULL,
                    etiquetas varchar(100) NOT NULL,
                    vendedor varchar(100) NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
            `);
            await connection.query(`
                CREATE TABLE IF NOT EXISTS productospsf (
                    id int(11) NOT NULL AUTO_INCREMENT,
                    codigop varchar(50) DEFAULT NULL,
                    tipo varchar(100) DEFAULT NULL,
                    medida varchar(100) DEFAULT NULL,
                    peso decimal(10,2) DEFAULT NULL,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
            `);
            await connection.query(`
                CREATE TABLE IF NOT EXISTS comandas (
                    id int(11) NOT NULL AUTO_INCREMENT,
                    codc varchar(50) DEFAULT NULL,
                    vendedor varchar(100) DEFAULT NULL,
                    etiqueta varchar(100) DEFAULT NULL,
                    codp varchar(50) DEFAULT NULL,
                    cantidad int(11) DEFAULT NULL,
                    fecha timestamp NOT NULL DEFAULT current_timestamp(),
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
            `);
            await connection.query(`
                CREATE TABLE IF NOT EXISTS usuarios (
                    id int(11) NOT NULL AUTO_INCREMENT,
                    usuario varchar(50) NOT NULL UNIQUE,
                    password varchar(255) NOT NULL,
                    rol varchar(50) NOT NULL DEFAULT 'user',
                    activo tinyint(1) NOT NULL DEFAULT 1,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
            `);
            connection.release();
            console.log('✅ Estructura de tablas verificada.');
            break;
        } catch (err) {
            retries--;
            console.log(`⏳ Esperando a la base de datos (${retries} intentos restantes)... ${err.message}`);
            if (retries === 0) {
                console.error('❌ No se pudo conectar a la base de datos tras múltiples intentos.');
                break;
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`====================================================`);
    initDB();
});