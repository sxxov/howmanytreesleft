@echo off
title how many trees left? (debug)
setlocal EnableDelayedExpansion
start /wait node --prof "%~dp0main.js"
for /f "delims=" %%i in ('dir /b /od /tc "."') do set a=%%i&& set b=!a:isolate=!&& set c=!a:~-3!&& if not x!b!==x%%i if x!c!==xlog set log=%%i
node --prof-process %log% > v8.txt
del /f /q %log%
echo v8 log outputted to v8.txt
pause