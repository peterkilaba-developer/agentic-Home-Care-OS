@echo off
findstr /v /c:"agentic-home-care-os.com" /c:"owneroperator.ai" C:\Windows\System32\drivers\etc\hosts > %TEMP%\hosts.new
if %ERRORLEVEL% EQU 0 (
    move /y %TEMP%\hosts.new C:\Windows\System32\drivers\etc\hosts
)
