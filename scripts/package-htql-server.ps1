# Đóng gói zip cài HTQL_550 server (Ubuntu) — đồng bộ setup_server.sh từ gốc repo.
# Định dạng: htql_server_v[YYYY].[MM].[BUILD] — BUILD tăng liên tục (không reset theo tháng/năm).
#
# Đầu ra cố định: phanmem\server\ — sau mỗi build chỉ giữ đúng 1 zip htql_server_v*.zip vừa tạo (build.mdc).
# Ghi đè thư mục (tuỳ chọn): $env:HTQL_PACK_SERVER_OUT = "D:\phat_hanh\htql_server"
$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$OutDir = if ($env:HTQL_PACK_SERVER_OUT) {
  $p = $env:HTQL_PACK_SERVER_OUT.Trim()
  if ([System.IO.Path]::IsPathRooted($p)) { $p } else { Join-Path $RepoRoot $p }
} else {
  Join-Path $RepoRoot 'phanmem\server'
}
$CounterFile = Join-Path $PSScriptRoot 'server-build-counter.txt'

function Clear-ServerPackFolderKeepOnlyNewZip {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][string]$KeepZipFileName
  )
  if (-not (Test-Path $Directory)) { return }
  Get-ChildItem -Path $Directory -Force -ErrorAction SilentlyContinue | Where-Object {
    $_.PSIsContainer -or ($_.Extension -ne '.zip')
  } | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
  }
  Get-ChildItem -Path $Directory -Filter 'htql_server_v*.zip' -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -ne $KeepZipFileName } | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$counter = 0
if (Test-Path $CounterFile) {
  $raw = (Get-Content $CounterFile -Raw).Trim()
  if (-not [int]::TryParse($raw, [ref]$counter)) { $counter = 0 }
} else {
  $vf = Join-Path $RepoRoot 'VERSION.txt'
  if (Test-Path $vf) {
    $parts = ((Get-Content $vf -Raw).Trim()) -split '\.'
    if ($parts.Length -ge 3) {
      [int]$c = 0
      if ([int]::TryParse($parts[2], [ref]$c)) { $counter = $c }
    }
  }
}
$counter++
Set-Content -Path $CounterFile -Value ([string]$counter) -NoNewline

$yyyy = Get-Date -Format yyyy
$mm = Get-Date -Format MM
$thirdSeg = if ($counter -lt 100) { '{0:D2}' -f $counter } else { [string]$counter }
$ver = "$yyyy.$mm.$thirdSeg"
$folderName = "htql_server_v$ver"
$zipName = "$folderName.zip"

$stage = Join-Path $env:TEMP "htql_pack_$([guid]::NewGuid().ToString('N'))"
$dst = Join-Path $stage $folderName
New-Item -ItemType Directory -Path $dst -Force | Out-Null

$rcArgs = @('/E', '/NFL', '/NDL', '/NJH', '/NJS', '/nc', '/ns', '/np', '/XD', 'node_modules', '__pycache__', '.git')

function Invoke-RobocopyOk {
  param([string]$Src, [string]$Dest)
  & robocopy $Src $Dest @rcArgs | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $Src -> $Dest" }
}

Invoke-RobocopyOk (Join-Path $RepoRoot 'server') (Join-Path $dst 'server')
Invoke-RobocopyOk (Join-Path $RepoRoot 'database') (Join-Path $dst 'database')
Invoke-RobocopyOk (Join-Path $RepoRoot 'deploy') (Join-Path $dst 'deploy')

$guideSrc = Join-Path $RepoRoot 'deploy\HUONG_DAN_CAI_DAT_SERVER_UBUNTU.md'
if (Test-Path $guideSrc) {
  Copy-Item $guideSrc (Join-Path $dst 'HUONG_DAN_CAI_DAT_SERVER_UBUNTU.md') -Force
}

$dataDst = Join-Path $dst 'data'
New-Item -ItemType Directory -Path $dataDst -Force | Out-Null
Set-Content -Path (Join-Path $dataDst 'README.txt') -Encoding UTF8 -Value 'Thư mục dữ liệu JSON (ứng dụng tạo khi chạy). Gói build loại trừ file demo .json.'

# setup_server.sh: UTF-8 + chỉ LF (Ubuntu); tránh lỗi /usr/bin/env: 'bash\r' khi zip build trên Windows
$setupSrc = Join-Path $RepoRoot 'setup_server.sh'
$setupDst = Join-Path $dst 'setup_server.sh'
$setupBytes = [System.IO.File]::ReadAllBytes($setupSrc)
$setupText = [System.Text.Encoding]::UTF8.GetString($setupBytes)
$setupText = $setupText -replace "`r`n", "`n" -replace "`r", "`n"
[System.IO.File]::WriteAllText($setupDst, $setupText, [System.Text.UTF8Encoding]::new($false))
# package.json gốc repo — donViTinhServer đọc ../package.json cho webAppVersion; zip phải dùng / trong entry (không dùng Compress-Archive).
Copy-Item (Join-Path $RepoRoot 'package.json') (Join-Path $dst 'package.json') -Force
$rootPkgPath = Join-Path $dst 'package.json'
$rootPkgRaw = Get-Content -Path $rootPkgPath -Raw -Encoding UTF8
$rootPkgRaw2 = $rootPkgRaw -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$ver`""
[System.IO.File]::WriteAllText($rootPkgPath, $rootPkgRaw2, [System.Text.UTF8Encoding]::new($false))
$serverPkgPath = Join-Path (Join-Path $dst 'server') 'package.json'
if (Test-Path $serverPkgPath) {
  $sp = Get-Content -Path $serverPkgPath -Raw -Encoding UTF8
  $sp2 = $sp -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$ver`""
  [System.IO.File]::WriteAllText($serverPkgPath, $sp2, [System.Text.UTF8Encoding]::new($false))
}
Set-Content -Path (Join-Path $dst 'VERSION.txt') -Value $ver -NoNewline

@"
FOLDER_NAME_IN_ZIP=$folderName
VERSION=$ver
BUILD=$counter
"@ | Set-Content -Path (Join-Path $dst 'PACKAGE_INFO.txt') -Encoding UTF8

$zipPath = Join-Path $OutDir $zipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Zip entries use / only (POSIX) — Windows Compress-Archive used \ and unzip on Ubuntu can exit 1 (warnings), breaking bash set -e on server update.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPathFull = [System.IO.Path]::GetFullPath($zipPath)
$dstFull = [System.IO.Path]::GetFullPath($dst)
if (-not $dstFull.EndsWith('\')) { $dstFull += '\' }
$baseUri = New-Object Uri $dstFull
$za = [System.IO.Compression.ZipFile]::Open($zipPathFull, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -Path $dstFull -Recurse -File -Force | ForEach-Object {
    $fileUri = New-Object Uri $_.FullName
    $rel = [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fileUri).ToString())
    $rel = ($rel -replace '\\', '/').TrimStart('/')
    $entryName = "$folderName/$rel"
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($za, $_.FullName, $entryName)
  }
} finally {
  $za.Dispose()
}

Remove-Item $stage -Recurse -Force

Clear-ServerPackFolderKeepOnlyNewZip -Directory $OutDir -KeepZipFileName $zipName

Get-ChildItem -Path $OutDir -File -ErrorAction SilentlyContinue | Where-Object {
  $n = $_.Name
  ($n -eq 'latest.yml') -or ($n -eq 'latest-mac.yml') -or ($n -like 'builder-*.yml') -or ($n -like 'builder-*.yaml') -or ($_.Extension -eq '.blockmap')
} | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  Write-Host "Removed build artifact in server out dir: $($_.Name)"
}

Set-Content -Path (Join-Path $RepoRoot 'VERSION.txt') -Value $ver -NoNewline

Write-Host "OK: $zipPath"
Write-Host "Out dir (only latest htql_server_v*.zip kept): $OutDir"
Write-Host "Tool Server: extractedFolderName = $folderName (see PACKAGE_INFO.txt in zip)."
