@echo off
title how many trees left?
if "%1"=="-f" (
	node "%~dp0main.js" -f
) else (
	node "%~dp0main.js"
)
pause