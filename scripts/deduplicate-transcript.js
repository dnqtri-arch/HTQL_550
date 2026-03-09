/**
 * Script loại bỏ các đoạn chat trùng lặp trong agent-transcripts
 * - Các tin nhắn assistant liên tiếp "Đang..." (progress) -> chỉ giữ tin cuối "Đã..." (tóm tắt)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TRANSCRIPT_PATH = path.join(
  __dirname,
  '..',
  '.cursor',
  'projects',
  'c-Users-Administrator-Desktop-HTQL-550',
  'agent-transcripts',
  '09e96734-cb74-4975-b551-ae33890bcf99',
  '09e96734-cb74-4975-b551-ae33890bcf99.jsonl'
)

function getText(msg) {
  if (!msg?.content) return ''
  const part = msg.content.find((c) => c.type === 'text')
  return part?.text || ''
}

function run() {
  const content = fs.readFileSync(TRANSCRIPT_PATH, 'utf8')
  const lines = content.split('\n').filter((l) => l.trim())
  const kept = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    try {
      const obj = JSON.parse(line)
      const role = obj.role

      if (role === 'user') {
        kept.push(line)
        i++
        continue
      }

      if (role === 'assistant') {
        const block = [line]
        let j = i + 1
        while (j < lines.length) {
          try {
            const next = JSON.parse(lines[j])
            if (next.role !== 'assistant') break
            block.push(lines[j])
            j++
          } catch {
            break
          }
        }

        if (block.length <= 1) {
          kept.push(block[0])
        } else {
          kept.push(block[block.length - 1])
        }
        i = j
        continue
      }

      kept.push(line)
      i++
    } catch (e) {
      kept.push(line)
      i++
    }
  }

  const backupPath = TRANSCRIPT_PATH + '.backup'
  fs.writeFileSync(backupPath, content, 'utf8')
  fs.writeFileSync(TRANSCRIPT_PATH, kept.join('\n') + '\n', 'utf8')
  console.log(`Đã xóa trùng lặp: ${lines.length} -> ${kept.length} dòng`)
  console.log(`Backup lưu tại: ${backupPath}`)
}

run()
