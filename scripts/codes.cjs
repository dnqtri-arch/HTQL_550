const s = process.argv[2]
console.log([...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' '))
