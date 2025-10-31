import pool from "../config/db.js";

export async function saveUpload(filename, eventId) {
  const [result] = await pool.query(
    "INSERT INTO uploads (filename, event_id, created_at) VALUES (?, ?, NOW())",
    [filename, eventId]
  );
  return result.insertId;
}

export async function getUploads() {
  const [rows] = await pool.query(`
    SELECT u.id, u.filename, u.created_at, e.name as event_name
    FROM uploads u
    LEFT JOIN events e ON e.id = u.event_id
    ORDER BY u.created_at DESC
  `);
  return rows;
}

export async function getUploadById(id) {
  const [rows] = await pool.query(
    `
    SELECT u.id, u.filename, u.created_at, e.name as event_name
    FROM uploads u
    LEFT JOIN events e ON e.id = u.event_id
    WHERE u.id = ?
  `,
    [id]
  );
  return rows[0];
}
