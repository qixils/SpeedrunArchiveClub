import { Pool } from 'pg';
import "dotenv/config";
import * as fs from 'fs/promises';
import * as path from 'path';

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export async function initializeDatabase() {
  try {
    // Read and execute the schema.sql file
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    await pool.query(schemaSQL);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
