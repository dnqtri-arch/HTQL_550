# Thanh tiến trình 8 giai đoạn (0%→100%) trước khi NSIS giải nén file ứng dụng.
# Bước 5/8: Kết nối máy chủ & đường dẫn lưu trữ (gọi /api/htql-meta, ghi htql-server-paths.json).
param(
  [Parameter(Mandatory = $true)][string]$InstallDir
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$port = 3001
$onlineHost = '14.224.152.48'
$prefix = '192.168.1'

function Set-PBar([int]$v) {
  if ($v -lt 0) { $v = 0 }
  if ($v -gt 100) { $v = 100 }
  $script:pb.Value = $v
  [System.Windows.Forms.Application]::DoEvents()
}

function Join-HtqlDataPath([string]$base, [string[]]$parts) {
  if (-not $base) { return '' }
  $sep = if ($base -match '\\') { '\' } else { '/' }
  $b = $base.TrimEnd('\', '/')
  return $b + $sep + ($parts -join $sep)
}

function Derive-HtqlPathsFromMeta($m) {
  $dl = ''
  if ($null -ne $m) {
    if ($m.pathDuLieu) { $dl = [string]$m.pathDuLieu }
    elseif ($m.dataDir) { $dl = [string]$m.dataDir }
  }

  $ssd = ''
  if ($null -ne $m -and $m.ssdRoot) { $ssd = [string]$m.ssdRoot.Trim() }
  if (-not $ssd) { $ssd = '/ssd_2tb/htql_550' }

  $hd = ''
  if ($null -ne $m -and $m.pathHoaDonChungTu) { $hd = [string]$m.pathHoaDonChungTu }
  if (-not $hd.Trim()) { $hd = Join-HtqlDataPath $ssd @('hdct') }

  $tk = ''
  if ($null -ne $m -and $m.pathThietKe) { $tk = [string]$m.pathThietKe }
  if (-not $tk.Trim()) { $tk = Join-HtqlDataPath $ssd @('thietke') }

  $cs = ''
  if ($null -ne $m -and $m.pathCoSoDuLieu) { $cs = [string]$m.pathCoSoDuLieu }
  if (-not $cs.Trim()) { $cs = Join-HtqlDataPath $dl @('sqlite') }

  return @{
    duLieu = $dl
    hoaDon = $hd
    thietKe = $tk
    coSo = $cs
  }
}

function Show-HtqlPathsStepDialog([string]$body) {
  $f = New-Object System.Windows.Forms.Form
  $f.Text = 'HTQL_550 — Bước 5/8: Kết nối máy chủ & đường dẫn lưu trữ'
  $f.Size = New-Object System.Drawing.Size(580, 400)
  $f.StartPosition = 'CenterScreen'
  $f.FormBorderStyle = 'FixedDialog'
  $f.MaximizeBox = $false
  $f.TopMost = $true

  $tb = New-Object System.Windows.Forms.TextBox
  $tb.Multiline = $true
  $tb.ReadOnly = $true
  $tb.ScrollBars = 'Vertical'
  $tb.Text = $body
  $tb.Location = New-Object System.Drawing.Point(12, 12)
  $tb.Size = New-Object System.Drawing.Size(540, 310)
  $tb.Font = New-Object System.Drawing.Font('Consolas', 9)

  $btn = New-Object System.Windows.Forms.Button
  $btn.Text = 'Tiếp tục'
  $btn.Location = New-Object System.Drawing.Point(440, 332)
  $btn.Size = New-Object System.Drawing.Size(112, 30)
  $btn.DialogResult = [System.Windows.Forms.DialogResult]::OK

  $f.Controls.Add($tb)
  $f.Controls.Add($btn)
  $f.AcceptButton = $btn
  $f.Add_Shown({ $f.Activate(); $btn.Focus() })
  [void]$f.ShowDialog()
  $f.Dispose()
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'HTQL_550 — Trình cài đặt (8 bước)'
$form.Size = New-Object System.Drawing.Size(540, 200)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.TopMost = $true

$lbl = New-Object System.Windows.Forms.Label
$lbl.AutoSize = $false
$lbl.Location = New-Object System.Drawing.Point(12, 12)
$lbl.Size = New-Object System.Drawing.Size(500, 44)
$lbl.Text = ''

$pb = New-Object System.Windows.Forms.ProgressBar
$pb.Location = New-Object System.Drawing.Point(12, 64)
$pb.Size = New-Object System.Drawing.Size(500, 22)
$pb.Minimum = 0
$pb.Maximum = 100
$script:pb = $pb

$form.Controls.Add($lbl)
$form.Controls.Add($pb)

function Step([string]$msg, [int]$pct) {
  $lbl.Text = $msg
  Set-PBar $pct
}

$form.Show()
$form.Activate()

# 0%
Step '1/8 Chào mừng — Logo Nam Bắc AD & giới thiệu HTQL_550 bản 64-bit' 0
Start-Sleep -Milliseconds 250

# 15%
Step '2/8 Cam kết — điều khoản nội bộ & bảo mật dữ liệu xưởng in' 15
Start-Sleep -Milliseconds 250

# 30%
Step "3/8 Vị trí — xác nhận cài đặt tại: $InstallDir" 30
Start-Sleep -Milliseconds 250

# 45% — quét LAN
Step '4/8 Quét mạng — dải LAN 192.168.1.1–254, cổng 3001...' 32
$found = $null
for ($i = 1; $i -le 254; $i++) {
  if ($found) { break }
  $ip = "$prefix.$i"
  $c = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $c.BeginConnect($ip, $port, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne(120)) {
      $c.EndConnect($iar)
      $found = $ip
    }
  }
  catch { }
  finally { try { $c.Close() } catch { } }
  if ($i % 30 -eq 0) {
    Set-PBar (32 + [int](13 * [math]::Min($i, 254) / 254))
  }
}
Set-PBar 45

$scanObj = [ordered]@{
  discoveredHost = $found
  apiPort        = $port
  scannedAt      = (Get-Date).ToString('o')
  prefix         = $prefix
}
$utf8Bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText((Join-Path $InstallDir 'htql-smart-connect.json'), ($scanObj | ConvertTo-Json -Compress), $utf8Bom)

# 5/8 — Kết nối máy chủ & đường dẫn (LAN / Online) + htql-server-paths.json
$apiBase = if ($found) { "http://${found}:${port}" } else { "http://${onlineHost}:${port}" }
$ketNoiMode = if ($found) { 'LAN' } else { 'Online' }

Step '5/8 Kết nối máy chủ & đường dẫn lưu trữ — đang gọi API...' 47
$meta = $null
try {
  $meta = Invoke-RestMethod -Uri "$apiBase/api/htql-meta" -TimeoutSec 8 -ErrorAction Stop
}
catch { }

$d = Derive-HtqlPathsFromMeta $meta
$connected = $null -ne $meta

$snapObj = [ordered]@{
  savedAt = (Get-Date).ToString('o')
  apiBase = $apiBase
  connected = $connected
  connectionMode = $ketNoiMode
  server = [ordered]@{
    name = if ($meta -and $meta.name) { [string]$meta.name } else { 'htql-550-server' }
    version = if ($meta -and $meta.version) { [string]$meta.version } else { '—' }
    webAppVersion = if ($meta -and $meta.webAppVersion) { [string]$meta.webAppVersion } else { '—' }
  }
  paths = [ordered]@{
    duLieu = $d.duLieu
    hoaDonChungTu = $d.hoaDon
    thietKe = $d.thietKe
    coSoDuLieu = $d.coSo
  }
}
[System.IO.File]::WriteAllText((Join-Path $InstallDir 'htql-server-paths.json'), ($snapObj | ConvertTo-Json -Depth 8), $utf8Bom)

$onlineObj = [ordered]@{
  host    = $onlineHost
  apiPort = $port
  note    = 'Fallback khi không có LAN (sau ~5s ứng dụng)'
  setAt   = (Get-Date).ToString('o')
}
[System.IO.File]::WriteAllText((Join-Path $InstallDir 'htql-online-fallback.json'), ($onlineObj | ConvertTo-Json -Compress), $utf8Bom)
Set-PBar 60

$bodyLines = @(
  "Kết nối: $ketNoiMode",
  "API: $apiBase",
  $(if ($connected) { 'Trạng thái API: đã lấy /api/htql-meta thành công.' } else { 'Trạng thái API: không gọi được máy chủ — vẫn ghi file cấu hình theo API dự kiến.' }),
  '',
  "Dữ liệu (JSON): $($d.duLieu)",
  "Cơ sở dữ liệu (SQLite): $($d.coSo)",
  'Đính kèm hóa đơn/chứng từ: ' + $d.hoaDon,
  'File thiết kế: ' + $d.thietKe,
  '',
  'Đã ghi: htql-server-paths.json, htql-online-fallback.json (cùng thư mục cài đặt).'
)
Show-HtqlPathsStepDialog ($bodyLines -join [Environment]::NewLine)

# 75%
Step '6/8 Kiểm tra phần cứng — RAM (>8GB khuyến nghị) & dung lượng đĩa trống' 62
$ramGb = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$drive = Get-PSDrive -Name C
$freeGb = [math]::Round($drive.Free / 1GB, 1)
$hw = [ordered]@{
  ramGb      = $ramGb
  freeGbC    = $freeGb
  okMinRam8  = ($ramGb -ge 8)
  okMinDisk1 = ($freeGb -ge 1)
  checkedAt  = (Get-Date).ToString('o')
}
[System.IO.File]::WriteAllText((Join-Path $InstallDir 'htql-hardware-check.json'), ($hw | ConvertTo-Json -Compress), $utf8Bom)
Set-PBar 75

# 90%
Step '7/8 Khởi tạo hệ thống — Registry & Shortcut sẽ được ghi ở bước giải nén NSIS' 88
Start-Sleep -Milliseconds 400
Set-PBar 90

# 100%
Step '8/8 Hoàn tất — sẵn sàng giải nén giao diện; sau đó có thể Chạy phần mềm ngay' 100
Start-Sleep -Milliseconds 350

$form.Close()
$form.Dispose()
