# [Lưu ý] Đặt tên bản client mới dùng `scripts/client-build-counter.txt` + sync-version.cjs (đồng bộ htql_server_v…).
# Script này chỉ còn để chỉnh tay VERSION_TAG kiểu cũ (VYYYY_MM_DD_NN) nếu cần bảo trì dữ liệu cũ.
# Tăng VERSION_TAG: cùng ngày tháng năm → +1 hậu tố; ngày mới → _01
$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$TagPath = Join-Path $RepoRoot 'phanmem\htqlClientInstaller\VERSION_TAG'

if (-not (Test-Path $TagPath)) { throw "Không tìm thấy: $TagPath" }

$line = (Get-Content -Path $TagPath -Raw).Trim()
if ($line -notmatch '^V(\d{4})_(\d{2})_(\d{2})_(\d+)$') {
  throw "VERSION_TAG không đúng định dạng VYYYY_MM_DD_NN: $line"
}

$y = [int]$Matches[1]; $mo = [int]$Matches[2]; $d = [int]$Matches[3]; $seq = [int]$Matches[4]
$today = Get-Date
$ty = $today.Year; $tmo = $today.Month; $td = $today.Day

if ($y -eq $ty -and $mo -eq $tmo -and $d -eq $td) {
  $seq++
} else {
  $y = $ty; $mo = $tmo; $d = $td; $seq = 1
}

$newTag = 'V{0:D4}_{1:D2}_{2:D2}_{3:D2}' -f $y, $mo, $d, $seq
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($TagPath, $newTag, $utf8NoBom)
Write-Host "VERSION_TAG -> $newTag"
