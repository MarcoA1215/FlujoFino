import { Inject } from '@nestjs/common';

export const getRepositoryToken = (entity: any, dataSource: string = 'default'): string => {
  if (!entity) return 'Repository';
  return typeof entity === 'string' ? `${entity}Repository` : `${entity.name}Repository`;
};

export const InjectRepository = (entity: any, dataSource: string = 'default'): ParameterDecorator => {
  return Inject(getRepositoryToken(entity, dataSource));
};

export const getDataSourceToken = (dataSource: string = 'default'): string => `${dataSource}DataSource`;
export const InjectDataSource = (dataSource?: string): ParameterDecorator => Inject(getDataSourceToken(dataSource));
export const getEntityManagerToken = (dataSource: string = 'default'): string => `${dataSource}EntityManager`;
export const InjectEntityManager = (dataSource?: string): ParameterDecorator => Inject(getEntityManagerToken(dataSource));

export class TypeOrmModule {
  static forRoot() {
    return { module: TypeOrmModule, providers: [], exports: [] };
  }
  static forFeature() {
    return { module: TypeOrmModule, providers: [], exports: [] };
  }
}
