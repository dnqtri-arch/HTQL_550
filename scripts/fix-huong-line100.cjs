const fs = require('fs')
const path = require('path')
const p = path.join(__dirname, '..', 'deploy', 'HUONG_DAN_CAI_DAT_SERVER_UBUNTU.md')
let t = fs.readFileSync(p, 'utf8')
const good = 'script ki\u1EC3m tra v\u00E0 h\u01B0\u1EDBng d\u1EABn snippet'
t = t.replace(/script ki\u1ec3m[^\n`]+snippet `deploy/, 'script ki\u1EC3m tra v\u00E0 h\u01B0\u1EDBng d\u1EABn snippet `deploy')
if (!t.includes(good)) {
  t = t.replace(/script ki\u1ec3m.tr.snippet `deploy/, good + ' `deploy')
}
fs.writeFileSync(p, t, 'utf8')
console.log('line100 ok', t.includes(good))
