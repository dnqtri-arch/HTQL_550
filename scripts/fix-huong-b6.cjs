const fs = require('fs')
const path = require('path')
const p = path.join(__dirname, '..', 'deploy', 'HUONG_DAN_CAI_DAT_SERVER_UBUNTU.md')
let t = fs.readFileSync(p, 'utf8')
t = t.replace(
  /script. \*\*kiểm tra\*\* và h.+?snippet proxy\)\./u,
  'script ch\u1EC9 **ki\u1EC3m tra** v\u00E0 h\u01B0\u1EDBng d\u1EABn snippet proxy).',
)
fs.writeFileSync(p, t, 'utf8')
console.log('b6 ok')
