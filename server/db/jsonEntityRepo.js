/**
 * CRUD entity lưu JSON (MySQL InnoDB — đồng bộ đa client).
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} table
 */
export function createJsonEntityRepo(pool, table) {
  function mapRow(r) {
    const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
    return { ...d, id: r.id }
  }

  async function list() {
    const [rows] = await pool.query(`SELECT id, data FROM ${table} ORDER BY id`)
    return rows.map(mapRow)
  }

  async function getById(id) {
    const [rows] = await pool.query(`SELECT id, data FROM ${table} WHERE id = ?`, [id])
    if (!rows.length) return null
    return mapRow(rows[0])
  }

  async function insert(payload) {
    const copy = { ...payload }
    const wantId = copy.id
    delete copy.id
    if (wantId != null && Number.isFinite(Number(wantId))) {
      const id = Number(wantId)
      const full = { ...copy, id }
      await pool.query(`INSERT INTO ${table} (id, data) VALUES (?, ?)`, [id, JSON.stringify(full)])
      await pool.query(`UPDATE ${table} SET version = version + 1 WHERE id = ?`, [id])
      return getById(id)
    }
    const [res] = await pool.query(`INSERT INTO ${table} (data) VALUES (CAST(? AS JSON))`, ['{}'])
    const id = res.insertId
    const full = { ...copy, id }
    await pool.query(`UPDATE ${table} SET data = ?, version = version + 1 WHERE id = ?`, [
      JSON.stringify(full),
      id,
    ])
    return getById(id)
  }

  async function update(id, payload) {
    const full = { ...payload, id }
    const [res] = await pool.query(
      `UPDATE ${table} SET data = ?, version = version + 1 WHERE id = ?`,
      [JSON.stringify(full), id],
    )
    if (res.affectedRows === 0) return null
    return getById(id)
  }

  async function remove(id) {
    const [res] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id])
    return res.affectedRows > 0
  }

  async function truncateAndSeed(seedRows) {
    await pool.query(`TRUNCATE TABLE ${table}`)
    for (const row of seedRows) {
      const full = { ...row }
      const id = full.id
      await pool.query(`INSERT INTO ${table} (id, data) VALUES (?, ?)`, [id, JSON.stringify(full)])
    }
    return list()
  }

  return { list, insert, update, remove, truncateAndSeed, getById }
}
