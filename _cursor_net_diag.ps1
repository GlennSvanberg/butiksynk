# Read-only network / security snapshot for Cursor connectivity troubleshooting
$ErrorActionPreference = 'SilentlyContinue'

Write-Host '=== Connection profiles ===' -ForegroundColor Cyan
Get-NetConnectionProfile | Select-Object Name, InterfaceAlias, IPv4Connectivity, NetworkCategory | Format-Table -AutoSize

Write-Host '=== WinHTTP system proxy ===' -ForegroundColor Cyan
netsh winhttp show proxy

Write-Host '=== User Internet Settings (proxy) ===' -ForegroundColor Cyan
$p = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
[PSCustomObject]@{
  ProxyEnable   = $p.ProxyEnable
  ProxyServer   = $p.ProxyServer
  AutoConfigURL = $p.AutoConfigUrl
  ProxyOverride = $p.ProxyOverride
} | Format-List

Write-Host '=== HKLM Internet Settings policies ===' -ForegroundColor Cyan
$lm = Get-ItemProperty -Path 'HKLM:\Software\Policies\Microsoft\Windows\CurrentVersion\Internet Settings'
if ($null -ne $lm) { $lm | Format-List } else { '(none or not readable)' }

Write-Host '=== DNS (IPv4) on interfaces with servers ===' -ForegroundColor Cyan
Get-DnsClientServerAddress -AddressFamily IPv4 |
  Where-Object { $_.ServerAddresses.Count -gt 0 } |
  Select-Object InterfaceAlias, ServerAddresses |
  Format-Table -AutoSize

Write-Host '=== Physical/link up adapters (summary) ===' -ForegroundColor Cyan
Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } |
  Select-Object Name, InterfaceDescription, LinkSpeed, MacAddress |
  Format-Table -AutoSize

Write-Host '=== Default routes (lowest metric first, top 12) ===' -ForegroundColor Cyan
Get-NetRoute -AddressFamily IPv4 |
  Where-Object { $_.DestinationPrefix -eq '0.0.0.0/0' } |
  Sort-Object RouteMetric |
  Select-Object -First 12 DestinationPrefix, NextHop, InterfaceAlias, RouteMetric |
  Format-Table -AutoSize

Write-Host '=== Processes (VPN / tunnel / common EDR names) ===' -ForegroundColor Cyan
$procPatterns = @(
  'zscaler', 'ZSA', 'ZSATunnel', 'vpn', 'anyconnect', 'cisco', 'globalprotect', 'pangp',
  'forti', 'fctvpn', 'wireguard', 'openvpn', 'tailscale', 'netskope', 'prisma',
  'citrix', 'checkpoint', 'sophos', 'sentinel', 'crowdstrike', 'elastic', 'defender'
)
Get-Process | ForEach-Object {
  $n = $_.ProcessName
  foreach ($pat in $procPatterns) {
    if ($n -match $pat) {
      return [PSCustomObject]@{ ProcessName = $n; Id = $_.Id; WS_MB = [math]::Round($_.WS / 1MB, 0) }
    }
  }
} | Sort-Object ProcessName | Get-Unique -AsString | Format-Table -AutoSize

Write-Host '=== Running services (keyword filter) ===' -ForegroundColor Cyan
Get-Service |
  Where-Object {
    $_.Status -eq 'Running' -and (
      $_.DisplayName -match 'Zscaler|VPN|Cisco|Fortinet|GlobalProtect|AnyConnect|WireGuard|OpenVPN|Tailscale|Netskope|Web Security|Zero Trust|Tunnel|Defender|CrowdStrike|Sentinel|Sophos|Checkpoint|Proxy|SDP'
    )
  } |
  Sort-Object DisplayName |
  Select-Object Status, Name, DisplayName |
  Format-Table -AutoSize -Wrap

Write-Host '=== Listening local proxies (common ports) ===' -ForegroundColor Cyan
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 8080,8888,3128,9090,12345 } |
  Select-Object LocalAddress, LocalPort, OwningProcess |
  ForEach-Object {
    $op = $_.OwningProcess
    $pn = (Get-Process -Id $op -ErrorAction SilentlyContinue).ProcessName
    [PSCustomObject]@{ Local = "$($_.LocalAddress):$($_.LocalPort)"; PID = $op; Process = $pn }
  } | Format-Table -AutoSize

Write-Host '=== Zscaler-related services (name ZSA*) ===' -ForegroundColor Cyan
Get-Service -Name 'ZSA*' -ErrorAction SilentlyContinue |
  Select-Object Status, Name, DisplayName |
  Format-Table -AutoSize

Write-Host '=== Done ===' -ForegroundColor Green
