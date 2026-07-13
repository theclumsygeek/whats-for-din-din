@echo off
rem Wrapper for Windows Task Scheduler: runs the backup and appends a
rem timestamped log entry to backups\backup.log. Task Scheduler runs
rem programs directly (no shell), so this cmd.exe script is what makes
rem output redirection to a log file possible.
cd /d "%~dp0.."
if not exist backups mkdir backups
echo ==== %date% %time% ==== >> backups\backup.log
"C:\Program Files\nodejs\node.exe" scripts\backup.mjs >> backups\backup.log 2>&1
echo(>> backups\backup.log
