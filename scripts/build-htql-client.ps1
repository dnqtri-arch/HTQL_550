# Build may tram HTQL_550: Vite + Electron NSIS x64 (Windows).
# Output folder: default phanmem\client\ — chỉ giữ file Setup vừa build (xóa HTQL_550_Setup_V*.exe cũ). See build.mdc.
# Override: $env:HTQL_CLIENT_OUT = absolute path or path relative to repo root.
$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$InstallerDir = Join-Path $RepoRoot 'phanmem\htqlClientInstaller'
$BumpTagScript = Join-Path $PSScriptRoot 'bump-htql-client-version.ps1'
$OutClientDir = if ($env:HTQL_CLIENT_OUT) {
  $p = $env:HTQL_CLIENT_OUT.Trim()
  if ([System.IO.Path]::IsPathRooted($p)) { $p } else { Join-Path $RepoRoot $p }
} else {
  Join-Path $RepoRoot 'phanmem\client'
}

function Remove-IfExists([string]$Path) {
  if (Test-Path $Path) {
    Remove-Item -Path $Path -Recurse -Force
    Write-Host "Removed: $Path"
  }
}

function Clear-ClientPackFolderKeepOnlyNewExe {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][string]$KeepExeName
  )
  if (-not (Test-Path $Directory)) { return }
  Get-ChildItem -Path $Directory -Filter 'HTQL_550_Setup_*.exe' -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -ne $KeepExeName } | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Remove-ElectronBuilderSideArtifacts {
  param([Parameter(Mandatory = $true)][string]$Directory)
  if (-not (Test-Path $Directory)) { return }
  Get-ChildItem -Path $Directory -File -ErrorAction SilentlyContinue | Where-Object {
    $n = $_.Name
    ($n -eq 'latest.yml') -or ($n -eq 'latest-mac.yml') -or ($n -like 'builder-*.yml') -or ($n -like 'builder-*.yaml') -or ($_.Extension -eq '.blockmap')
  } | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    Write-Host "Removed build artifact: $($_.Name)"
  }
}

# 0 - Clean prior build artifacts (dist, installer staging)
Remove-IfExists (Join-Path $RepoRoot 'dist')
Remove-IfExists (Join-Path $InstallerDir 'web-dist')
Remove-IfExists (Join-Path $InstallerDir 'release')
if (-not (Test-Path $OutClientDir)) { New-Item -ItemType Directory -Path $OutClientDir -Force | Out-Null }

# 0.1 - Auto bump VERSION_TAG (có thể tắt khi cần tái build cùng tag)
$skipAutoBump = @('1', 'true', 'on') -contains [string]$env:HTQL_CLIENT_SKIP_AUTO_BUMP
if (-not $skipAutoBump) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $BumpTagScript
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# 1 - Sync VERSION_TAG to .env.production
Set-Location (Join-Path $RepoRoot 'phanmem\htqlClientInstaller')
node .\scripts\sync-version.cjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 2 - Vite production build (repo root)
Set-Location $RepoRoot
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3 - electron-builder NSIS
Set-Location $InstallerDir
if (-not (Test-Path (Join-Path $InstallerDir 'node_modules'))) {
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4 - Copy single Setup exe; strip everything else from output dir
$exe = Get-ChildItem -Path (Join-Path $InstallerDir 'release') -Filter 'HTQL_550_Setup_*.exe' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $exe) {
  throw 'Không tìm thấy HTQL_550_Setup_*.exe trong phanmem\htqlClientInstaller\release'
}
Copy-Item -Path $exe.FullName -Destination (Join-Path $OutClientDir $exe.Name) -Force
Write-Host "OK exe: $($exe.FullName) -> $OutClientDir\$($exe.Name)"

Clear-ClientPackFolderKeepOnlyNewExe -Directory $OutClientDir -KeepExeName $exe.Name
Remove-ElectronBuilderSideArtifacts -Directory $OutClientDir

Remove-IfExists (Join-Path $InstallerDir 'release')
Remove-IfExists (Join-Path $InstallerDir 'web-dist')

Write-Host "Done. Output: $OutClientDir\$($exe.Name) (chỉ giữ bản vừa build)"
