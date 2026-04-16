# Quét LAN 192.168.1.2–254 — TCP cổng 3001 (HTQL API). Ghi JSON UTF-8.
param(
  [Parameter(Mandatory = $true)][string]$OutFile,
  [int]$Port = 3001,
  [string]$Prefix = '192.168.1'
)

$ErrorActionPreference = 'SilentlyContinue'
$found = $null

for ($i = 2; $i -le 254; $i++) {
  if ($found) { break }
  $ip = "$Prefix.$i"
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect($ip, $Port, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne(120)) {
      $client.EndConnect($iar)
      $found = $ip
    }
  }
  catch { }
  finally {
    try { $client.Close() } catch { }
  }
}

$obj = [ordered]@{
  discoveredHost = $found
  apiPort        = $Port
  scannedAt      = (Get-Date).ToString('o')
  prefix         = $Prefix
}
$json = ($obj | ConvertTo-Json -Compress)
$utf8Bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($OutFile, $json, $utf8Bom)
