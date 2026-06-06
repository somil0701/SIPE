import 'dotenv/config';
import Redis from 'ioredis';

const url = process.env.REDIS_URL;
console.log('Testing Redis connection to:', url);

const redis = new Redis(url as string, {
  connectTimeout: 10000,
  enableOfflineQueue: false,
  tls: {}
});

redis.on('connect', () => console.log('Redis connected!'));
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('reconnecting', () => console.log('Redis reconnecting...'));

setTimeout(async () => {
  try {
    await redis.set('test_key', 'hello from upstash');
    const val = await redis.get('test_key');
    console.log('Successfully set and got test_key:', val);
  } catch (e) {
    console.error('Failed to get/set:', e);
  }
  redis.disconnect();
  process.exit(0);
}, 2000);
