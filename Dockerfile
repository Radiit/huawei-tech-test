FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    tzdata \
    && rm -rf /var/cache/apk/*

ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY src/ ./src/
COPY prisma/ ./prisma/

RUN npx prisma generate

RUN mkdir -p /app/data /app/logs /home/cron

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app /home/cron

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "src/app.js"]