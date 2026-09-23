# 辅助：以独立进程运行 backend 下 python 脚本，规避 IDE 终端子进程句柄继承导致的
# WinError 10038（asyncio _overlapped 初始化失败）。
# 用法：.\_run_py.ps1 -Script test_chat_api.py [-Log verification.log] [-TimeoutSec 300]
param(
    [Parameter(Mandatory = $true)][string]$Script,
    [string]$Log,
    [int]$TimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
$python = 'D:\personalProject\ai_doctor\.venv\Scripts\python.exe'
$cwd = 'D:\personalProject\ai_doctor\backend'
$scriptPath = Join-Path $cwd $Script
$outLog = Join-Path $cwd $Log
if (-not $Log) {
    $outLog = Join-Path $cwd ("_out_{0}.log" -f [guid]::NewGuid().ToString('N').Substring(0, 8))
}

# 内层：自 PowerShell 启动 python 并把 stdout/stderr 全部重定向到日志，末尾回传退出码
$inner = "& '$python' '$scriptPath' *> '$outLog' 2>&1; exit `$LASTEXITCODE"
$cmdline = "powershell -NoProfile -ExecutionPolicy Bypass -Command `"$inner`""

$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine      = $cmdline
    CurrentDirectory = $cwd
}
$pidx = $r.ProcessId
Write-Output "launched pid=$pidx"

$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
    if (-not (Get-Process -Id $pidx -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Seconds 1
}
if (Get-Process -Id $pidx -ErrorAction SilentlyContinue) {
    Write-Output "TIMEOUT after $TimeoutSec s (pid=$pidx still running)"
    Stop-Process -Id $pidx -Force -ErrorAction SilentlyContinue
}
Write-Output "===== LOG: $outLog ====="
Get-Content $outLog -Raw -ErrorAction SilentlyContinue