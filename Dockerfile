FROM node:22-bookworm-slim

WORKDIR /app

# نصب وابستگی‌ها جدا از کپی سورس، تا کش لایه‌های Docker حفظ شود
COPY package.json package-lock.json ./
RUN npm ci

# کپی بقیه سورس و ساخت برنامه
COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
