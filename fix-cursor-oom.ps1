# Script khắc phục lỗi OOM Cursor (-536870904)
# Chạy script này SAU KHI đã đóng Cursor hoàn toàn

$workspaceStorage = "$env:APPDATA\Cursor\User\workspaceStorage"
$backupRoot = "$env:USERPROFILE\Desktop\CursorWorkspaceBackup"

Write-Host "=== Khắc phuc loi OOM Cursor ===" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Cursor có đang chạy không
$cursorProcess = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
if ($cursorProcess) {
    Write-Host "CANH BAO: Cursor dang chay! Hay dong Cursor hoan toan roi chay lai script." -ForegroundColor Red
    Write-Host "Nhan phim bat ky de thoat..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

if (-not (Test-Path $workspaceStorage)) {
    Write-Host "Khong tim thay thu muc workspaceStorage." -ForegroundColor Yellow
    exit 1
}

# Lấy thư mục mới sửa nhất (thường là project đang dùng)
$folders = Get-ChildItem $workspaceStorage -Directory | Sort-Object LastWriteTime -Descending
$targetFolder = $folders[0]
$targetPath = $targetFolder.FullName
$sizeMB = [math]::Round((Get-ChildItem $targetPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 2)

Write-Host "Thu muc workspace lon nhat (chat history, cache):" -ForegroundColor Yellow
Write-Host "  $($targetFolder.Name)"
Write-Host "  Kich thuoc: $sizeMB MB"
Write-Host "  Sua lan cuoi: $($targetFolder.LastWriteTime)"
Write-Host ""

# Backup trước khi xóa
$backupPath = "$backupRoot\$($targetFolder.Name)_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "Dang backup den: $backupPath" -ForegroundColor Gray
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
Copy-Item -Path "$targetPath\*" -Destination $backupPath -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Backup hoan thanh." -ForegroundColor Green

# Xóa thư mục workspace
Remove-Item -Path $targetPath -Recurse -Force -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Da xoa workspace storage thanh cong!" -ForegroundColor Green
Write-Host ""
Write-Host "Hay mo lai Cursor. Chat history va layout pane se bi xoa nhung code van nguyen ven." -ForegroundColor Cyan
Write-Host "Backup duoc luu tai: $backupPath" -ForegroundColor Gray
