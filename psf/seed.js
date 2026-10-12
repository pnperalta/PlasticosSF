import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const usuarios = [
    { usuario: 'logistica', password: '#Plastico_Sf2026', rol: 'admin' },
    { usuario: 'encargados', password: '#Encargados_PsF2026', rol: 'encargado' },
];

for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
        'INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)',
        [u.usuario, hash, u.rol]
    );
    console.log(`Usuario ${u.usuario} creado`);
}

process.exit(0);