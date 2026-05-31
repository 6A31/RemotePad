@echo off
cd /d "%~dp0"
call npx tsx packages\host\scripts\change-password.ts %*
