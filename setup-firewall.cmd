@echo off
netsh advfirewall firewall add rule name="RemotePad (9470)" dir=in action=allow protocol=TCP localport=9470 profile=private
if %ERRORLEVEL%==0 (
  echo Done. Other devices on your network can now reach port 9470.
) else (
  echo Failed. Run this script as Administrator.
)
pause
