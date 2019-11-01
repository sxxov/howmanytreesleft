#!/bin/bash
args=("$@")
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
title="how many trees left?"

echo -e '\033]2;'$title'\007'

if  [ "${args[0]}" = "-f" ]
then
	node "\\${DIR:3:999999}\main.js" -f
else 
	node "\\${DIR:3:999999}\main.js"
fi
read -p "Press [Enter] key to continue..."