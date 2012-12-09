#!/bin/bash
IP=`ifconfig | grep 'inet 192' | awk '{print $2}'`;
ulimit -n 2048;
node ngv_server.js $IP 8000;

