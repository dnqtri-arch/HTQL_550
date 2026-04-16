; NSIS — Unicode. Welcome, C:\HTQL550, trang tiến trình 8 bước (PowerShell), giải nén, SQLite.

!include WinMessages.nsh

!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\HTQL550"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\HTQL550"
  SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\HTQL550"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\HTQL550"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Nam Bắc AD — HTQL_550 (64-bit)"
  !define MUI_WELCOMEPAGE_TEXT "Chào mừng đến với trình cài đặt HTQL_550.$\r$\n$\r$\n• Logo & nhận diện Nam Bắc AD$\r$\n• Hệ thống quản lý máy trạm Windows (64-bit)$\r$\n• Sau bước chọn thư mục: thanh tiến trình 8 giai đoạn (quét LAN, WAN, phần cứng…)$\r$\n$\r$\nNhấn Tiếp để tiếp tục."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customPageAfterChangeDir
  Page custom HtqlWizardPageShow HtqlWizardPageLeave
!macroend

Function HtqlWizardPageShow
  File /nonfatal /oname=$PLUGINSDIR\htql-install-wizard.ps1 "${BUILD_RESOURCES_DIR}\htql-install-wizard.ps1"
  IfFileExists "$PLUGINSDIR\htql-install-wizard.ps1" 0 skip_wiz
    ExecWait '"powershell.exe" -WindowStyle Hidden -STA -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\htql-install-wizard.ps1" -InstallDir "$INSTDIR"' $0
    GetDlgItem $R1 $HWNDPARENT 1
    SendMessage $R1 ${BM_CLICK} 0 0
  skip_wiz:
FunctionEnd

Function HtqlWizardPageLeave
FunctionEnd

!macro customInstall
  SetDetailsPrint both

  DetailPrint "Đang khởi tạo SQLite & cache sau khi đã chép file ứng dụng..."
  SetShellVarContext all
  CreateDirectory "$COMMONAPPDATA\HTQL550\sqlite"
  CreateDirectory "$COMMONAPPDATA\HTQL550\cache-thiet-ke"
  DetailPrint "Đang tạo tệp SQLite cục bộ (ProgramData)..."
  ClearErrors
  FileOpen $R9 "$COMMONAPPDATA\HTQL550\sqlite\htql_local.db" w
  FileClose $R9
  DetailPrint "Đang tạo thư mục Cache thiết kế..."
  DetailPrint "Hoàn tất thiết lập máy trạm HTQL_550."
  SetDetailsPrint listonly
!macroend
