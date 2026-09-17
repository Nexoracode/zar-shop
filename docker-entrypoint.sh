#!/bin/sh
set -e

echo "در حال بررسی دسترسی به دیتابیس..."
until node -e "
const net = require('net');
const socket = net.createConnection({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT) });
socket.on('connect', () => { socket.end(); process.exit(0); });
socket.on('error', () => process.exit(1));
" 2>/dev/null; do
  echo "دیتابیس هنوز آماده نیست، ۲ ثانیه صبر می‌کنیم..."
  sleep 2
done

echo "اجرای migrationهای دیتابیس..."
npx prisma migrate deploy

echo "اجرای برنامه..."
exec npm start
