import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface RamCacheItem {
  value: string;
  expiresAt: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  // Memoria RAM como fallback transparente si Redis no está configurado o si se cae la conexión
  private readonly memoryFallback = new Map<string, RamCacheItem>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.log('ℹ️ REDIS_URL no encontrada en entorno. Operando con caché en RAM (fallback seguro).');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 4000,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn('⚠️ Reintentos de reconexión a Redis agotados. Conmutando a modo fallback.');
            return null; // Detener reintentos continuos para no saturar CPU
          }
          return Math.min(times * 300, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('🚀 Conexión con Redis establecida exitosamente.');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️ Error en conexión Redis (${err?.message || err}). Conmutando automáticamente a fallback.`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (initErr: any) {
      this.logger.error(`❌ Error inicializando cliente Redis: ${initErr?.message}`);
      this.isConnected = false;
    }
  }

  onModuleDestroy() {
    if (this.client) {
      try {
        this.client.disconnect();
      } catch {
        // Ignorar errores al desconectar en shutdown
      }
    }
    this.memoryFallback.clear();
  }

  /**
   * Verifica si la conexión con el servidor Redis está activa
   */
  isReady(): boolean {
    return this.isConnected && !!this.client;
  }

  /**
   * Obtiene un valor en formato string (desde Redis o RAM fallback)
   */
  async get(key: string): Promise<string | null> {
    if (this.isReady()) {
      try {
        return await this.client!.get(key);
      } catch (err: any) {
        this.logger.warn(`Fallo al leer de Redis [${key}]: ${err?.message}. Usando RAM fallback.`);
      }
    }

    // Fallback a memoria RAM
    const item = this.memoryFallback.get(key);
    if (!item) return null;
    if (item.expiresAt > 0 && Date.now() > item.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Obtiene y parsea un objeto JSON
   */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Guarda un valor string con TTL opcional en segundos
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isReady()) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client!.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client!.set(key, value);
        }
        return;
      } catch (err: any) {
        this.logger.warn(`Fallo al guardar en Redis [${key}]: ${err?.message}. Guardando en RAM fallback.`);
      }
    }

    // Fallback a memoria RAM
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.memoryFallback.set(key, { value, expiresAt });
  }

  /**
   * Serializa y guarda un objeto como JSON con TTL
   */
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Elimina una clave de Redis y de la memoria RAM
   */
  async del(key: string): Promise<void> {
    this.memoryFallback.delete(key);

    if (this.isReady()) {
      try {
        await this.client!.del(key);
      } catch (err: any) {
        this.logger.warn(`Fallo al borrar clave en Redis [${key}]: ${err?.message}`);
      }
    }
  }

  /**
   * Adquiere un bloqueo atómico distribuido (Lock / Mutex)
   * Devuelve `true` si adquirió el lock, `false` si ya está bloqueado por otra petición
   */
  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.isReady()) {
      try {
        const result = await this.client!.set(key, value, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch (err: any) {
        this.logger.warn(`Fallo en setNx de Redis [${key}]: ${err?.message}. Usando RAM fallback.`);
      }
    }

    // Fallback atómico en RAM
    const now = Date.now();
    const existing = this.memoryFallback.get(key);
    if (existing && (existing.expiresAt === 0 || existing.expiresAt > now)) {
      return false; // Bloqueado
    }

    this.memoryFallback.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
    });
    return true;
  }

  /**
   * Elimina claves coincidentes con un patrón (ej: 'tenant:123:*')
   */
  async delPattern(pattern: string): Promise<void> {
    // Limpiar RAM
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.memoryFallback.keys()) {
      if (regex.test(key)) {
        this.memoryFallback.delete(key);
      }
    }

    if (this.isReady()) {
      try {
        const stream = this.client!.scanStream({ match: pattern, count: 50 });
        stream.on('data', async (keys: string[]) => {
          if (keys && keys.length > 0) {
            await this.client!.del(...keys);
          }
        });
      } catch (err: any) {
        this.logger.warn(`Fallo al eliminar patrón [${pattern}] en Redis: ${err?.message}`);
      }
    }
  }
}
