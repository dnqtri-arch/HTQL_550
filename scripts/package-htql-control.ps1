# Đóng gói HTQL_550 Server (Electron portable) — chỉ giữ bản portable vừa build trong phanmem\tool (xóa bản cũ).
$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$OutDir = Join-Path $RepoRoot 'phanmem\tool'
$ControlDir = Join-Path $RepoRoot 'phanmem\controlCenter'
$ControlPkgPath = Join-Path $ControlDir 'package.json'

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

# Tự tăng version Tool mỗi lần build (patch): 2.6.0 -> 2.6.1 -> 2.6.2 ...
$pkgRaw = Get-Content -Path $ControlPkgPath -Raw -Encoding UTF8
$m = [regex]::Match($pkgRaw, '"version"\s*:\s*"(\d+)\.(\d+)\.(\d+)"')
if (-not $m.Success) { throw "Không đọc được version semver trong $ControlPkgPath" }
[int]$maj = $m.Groups[1].Value
[int]$min = $m.Groups[2].Value
[int]$pat = $m.Groups[3].Value
$nextVersion = "$maj.$min.$($pat + 1)"
$pkgRaw2 = [regex]::Replace($pkgRaw, '"version"\s*:\s*"[^"]+"', "`"version`": `"$nextVersion`"", 1)
[System.IO.File]::WriteAllText($ControlPkgPath, $pkgRaw2, [System.Text.UTF8Encoding]::new($false))
Write-Host "Tool version -> $nextVersion"

Set-Location $ControlDir
npm run build
if ($LASTEXITCODE -ne 0) { throw "controlCenter npm run build failed" }

$releaseDir = Join-Path $ControlDir 'release'
$exe = Get-ChildItem -Path $releaseDir -Filter 'HTQL_550 Server-*-Portable.exe' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $exe) { throw "Không tìm thấy Portable exe (HTQL_550 Server-*-Portable.exe) trong $releaseDir" }

$destExe = Join-Path $OutDir $exe.Name
if (Test-Path $destExe) {
  Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq (Resolve-Path -LiteralPath $destExe).Path } |
    ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
}

Copy-Item -Path $exe.FullName -Destination $destExe -Force
Get-ChildItem -Path $OutDir -File -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -like 'builder-*.yml' -or $_.Name -like 'builder-*.yaml' -or $_.Name -eq 'latest.yml' -or $_.Extension -eq '.blockmap'
} | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }

Get-ChildItem -Path $OutDir -Filter 'HTQL_550 Server-*-Portable.exe' -File -ErrorAction SilentlyContinue |
Where-Object { $_.Name -ne $exe.Name } | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
}

# Dọn build tạm (giữ repo gọn; portable đã nằm trong phanmem\tool)
Remove-Item -Path (Join-Path $ControlDir 'release') -Recurse -Force -ErrorAction SilentlyContinue

Set-Location $RepoRoot

Write-Host "OK: $(Join-Path $OutDir $exe.Name)"
