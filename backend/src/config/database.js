import mysql from 'mysql2/promise';
import env from './env.js';

let pool = null;
let isConnected = false;
let lastError = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
database: env.db.name,
ssl: {
  rejectUnauthorized: true
},
      waitForConnections: true,
      connectionLimit: env.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      decimalNumbers: true, // Parse DECIMAL as float/number for easy calculation
      timezone: '+00:00', // Enforce UTC
      dateStrings: false
    });
  }
  return pool;
}

/**
 * Tests connection to MySQL and updates health status
 */
export async function testConnection() {
  try {
    const currentPool = getPool();
    const connection = await currentPool.getConnection();
    await connection.query('SELECT 1 AS health_check');
    connection.release();
    isConnected = true;
    lastError = null;
    console.log(`[Database] Successfully connected to MySQL at ${env.db.host}:${env.db.port}/${env.db.name}`);
    return { ok: true, message: 'Connected to MySQL database' };
  } catch (err) {
    isConnected = false;
    lastError = err.message;
    console.warn(`[Database WARNING] Could not connect to MySQL (${env.db.host}:${env.db.port}): ${err.message}`);
    console.warn(`[Database NOTICE] Make sure MySQL 8 is running and stayease_db is created.`);
    return { ok: false, error: err.message };
  }
}

/**
 * Returns current DB health info
 */
export function getDbStatus() {
  return {
    connected: isConnected,
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    lastError: lastError
  };
}

/**
 * Helper to run parameterized queries safely
 */
export async function query(sql, params = []) {
  const currentPool = getPool();
  const [results] = await currentPool.query(sql, params);
  return results;
}

/**
 * Helper to execute a database transaction
 * @param {Function} callback - async (connection) => { ... }
 */
export async function withTransaction(callback) {
  const currentPool = getPool();
  const connection = await currentPool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export default {
  getPool,
  testConnection,
  getDbStatus,
  query,
  withTransaction
};
