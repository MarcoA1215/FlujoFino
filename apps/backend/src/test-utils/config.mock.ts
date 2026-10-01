export class ConfigService {
  get(key: string, defaultValue?: any) {
    return process.env[key] ?? defaultValue;
  }
}

export class ConfigModule {
  static forRoot() {
    return { module: ConfigModule, providers: [ConfigService], exports: [ConfigService] };
  }
}
