const fs = require('fs')
const path = require('path')
const p = path.join(__dirname, '..', 'phanmem', 'controlCenter', 'src', 'App.tsx')
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/)
let i = lines.findIndex((l) => l.trim() === 'try {')
if (i < 0) throw new Error('try not found')
let j = i + 1
let n = 0
while (j < lines.length && !/^\s*} finally/.test(lines[j])) {
  const line = lines[j]
  if (line.startsWith('    ') && !line.startsWith('      ')) {
    lines[j] = '  ' + line
    n++
  }
  j++
}
fs.writeFileSync(p, lines.join('\n'), 'utf8')
console.log('indented lines', n)
