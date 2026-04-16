/**
 * Upload file lên SSD (thiết kế / chứng từ / ảnh VTHH) — POST multipart + GET theo query.
 * kind=vthh_hinh → HTQL_PATH_VTHH_HINH_ANH (mặc định …/htql_550/vthh).
 */
import fs from 'fs'
import path from 'path'
import multer from 'multer'

const MAX_BYTES = 2000 * 1024 * 1024
const MAX_BYTES_VTHH_HINH = 15 * 1024 * 1024

function sanitizeRelativeDir(s) {
  if (!s || typeof s !== 'string') return ''
  const n = path.normalize(s).replace(/\\/g, '/')
  if (n.includes('..')) return ''
  return n.replace(/^\/+/, '').replace(/\/+$/, '')
}

function safeFilename(name) {
  const b = path.basename(String(name || 'file'))
  const t = b.replace(/[<>:"|?*\x00-\x1f]/g, '_').slice(0, 220)
  return t || 'file'
}

function normalizeKind(q) {
  const k = String(q || 'chung_tu')
  if (k === 'thiet_ke') return 'thiet_ke'
  if (k === 'vthh_hinh') return 'vthh_hinh'
  return 'chung_tu'
}

function resolveUploadBase(kind, { pathThietKe, pathChungTu, pathVthhHinhAnh }) {
  if (kind === 'thiet_ke') return pathThietKe || ''
  if (kind === 'vthh_hinh') return pathVthhHinhAnh || ''
  return pathChungTu || ''
}

export function mountHtqlUploadRoutes(app, { pathThietKe, pathChungTu, pathVthhHinhAnh }) {
  const storage = multer.diskStorage({
    destination(req, _file, cb) {
      try {
        const kind = normalizeKind(req.query?.kind)
        const base = resolveUploadBase(kind, { pathThietKe, pathChungTu, pathVthhHinhAnh })
        if (!base) return cb(new Error('Chưa cấu hình đường dẫn lưu file (SSD / DATA_DIR)'))
        const rel = sanitizeRelativeDir(String(req.query?.relativeDir || ''))
        const dest = rel ? path.join(base, rel) : path.join(base, '_uploads')
        fs.mkdirSync(dest, { recursive: true })
        cb(null, dest)
      } catch (e) {
        cb(e)
      }
    },
    filename(req, file, cb) {
      const qn = req.query?.filename
      cb(null, safeFilename(qn ? String(qn) : file.originalname))
    },
  })

  const upload = multer({
    storage,
    limits: { fileSize: MAX_BYTES },
  })

  app.post('/api/htql-upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Thiếu file (field name: file)' })
      const kind = normalizeKind(req.query?.kind)
      if (kind === 'vthh_hinh' && req.file.size > MAX_BYTES_VTHH_HINH) {
        try {
          fs.unlinkSync(req.file.path)
        } catch (_) {
          /* ignore */
        }
        return res.status(400).json({ error: 'Ảnh VTHH tối đa 15 MB' })
      }
      const base = resolveUploadBase(kind, { pathThietKe, pathChungTu, pathVthhHinhAnh })
      if (!base) return res.status(500).json({ error: 'Thiếu cấu hình đường dẫn' })
      const full = path.resolve(req.file.path)
      const baseResolved = path.resolve(base)
      const relFromBase = path.relative(baseResolved, full).split(path.sep).join('/')
      if (relFromBase.startsWith('..') || path.isAbsolute(relFromBase)) {
        try {
          fs.unlinkSync(req.file.path)
        } catch (_) {
          /* ignore */
        }
        return res.status(400).json({ error: 'Đường dẫn không hợp lệ' })
      }
      res.json({
        ok: true,
        kind,
        name: req.file.filename,
        size: req.file.size,
        relativePath: relFromBase,
      })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  app.get('/api/htql-files', (req, res) => {
    try {
      const kind = String(req.query.kind || '')
      const relRaw = String(req.query.rel || '')
      const base =
        kind === 'thiet_ke'
          ? pathThietKe
          : kind === 'chung_tu'
            ? pathChungTu
            : kind === 'vthh_hinh'
              ? pathVthhHinhAnh
              : null
      if (!base || !relRaw) return res.status(400).json({ error: 'Thiếu kind hoặc rel' })
      const safe = sanitizeRelativeDir(relRaw)
      if (!safe) return res.status(400).json({ error: 'rel không hợp lệ' })
      const full = path.resolve(path.join(base, safe))
      const baseResolved = path.resolve(base)
      if (!full.startsWith(baseResolved + path.sep) && full !== baseResolved) {
        return res.status(400).end()
      }
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return res.status(404).end()
      res.setHeader('Content-Disposition', 'inline')
      return res.sendFile(full)
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  /** Xóa file đính kèm / ảnh VTHH trên SSD (khi gỡ khỏi chứng từ hoặc xóa bản ghi). */
  app.delete('/api/htql-files', (req, res) => {
    try {
      const kind = String(req.query.kind || '')
      const relRaw = String(req.query.rel || '')
      const base =
        kind === 'thiet_ke'
          ? pathThietKe
          : kind === 'chung_tu'
            ? pathChungTu
            : kind === 'vthh_hinh'
              ? pathVthhHinhAnh
              : null
      if (!base || !relRaw) return res.status(400).json({ error: 'Thiếu kind hoặc rel' })
      const safe = sanitizeRelativeDir(relRaw)
      if (!safe) return res.status(400).json({ error: 'rel không hợp lệ' })
      const full = path.resolve(path.join(base, safe))
      const baseResolved = path.resolve(base)
      if (!full.startsWith(baseResolved + path.sep) && full !== baseResolved) {
        return res.status(400).json({ error: 'Đường dẫn không hợp lệ' })
      }
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
        return res.json({ ok: true, deleted: false })
      }
      fs.unlinkSync(full)
      return res.json({ ok: true, deleted: true })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  /** Đổi tên / di chuyển file trong cùng gốc `thiet_ke` (vd `_pending_dktk/...` → `kh00001/...`). */
  app.post('/api/htql-files-move', (req, res) => {
    try {
      const kind = normalizeKind(req.body?.kind)
      if (kind !== 'thiet_ke') return res.status(400).json({ error: 'Chỉ hỗ trợ kind=thiet_ke' })
      const base = pathThietKe
      if (!base) return res.status(500).json({ error: 'Thiếu cấu hình path thiết kế' })
      const fromRel = sanitizeRelativeDir(String(req.body?.fromRel || ''))
      const toRel = sanitizeRelativeDir(String(req.body?.toRel || ''))
      if (!fromRel || !toRel) return res.status(400).json({ error: 'Thiếu fromRel hoặc toRel' })
      const fromFull = path.resolve(path.join(base, fromRel))
      const toFull = path.resolve(path.join(base, toRel))
      const baseResolved = path.resolve(base)
      for (const f of [fromFull, toFull]) {
        if (!f.startsWith(baseResolved + path.sep) && f !== baseResolved) {
          return res.status(400).json({ error: 'Đường dẫn không hợp lệ' })
        }
      }
      if (!fs.existsSync(fromFull) || !fs.statSync(fromFull).isFile()) {
        return res.status(404).json({ error: 'Không thấy file nguồn' })
      }
      fs.mkdirSync(path.dirname(toFull), { recursive: true })
      fs.renameSync(fromFull, toFull)
      return res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })
}
