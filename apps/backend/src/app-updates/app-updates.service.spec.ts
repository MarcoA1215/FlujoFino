import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppUpdatesService } from './app-updates.service';
import { AppUpdatesController } from './app-updates.controller';
import { AppUpdate } from '../entities/app-update.entity';
import { NotFoundException } from '@nestjs/common';

describe('AppUpdatesService and Controller', () => {
  let service: AppUpdatesService;
  let controller: AppUpdatesController;

  const mockAppUpdates: Partial<AppUpdate>[] = [
    {
      id: 'update-1',
      title: 'Mejoras en el POS y Zonas de Entrega',
      version: 'v1.1.0',
      summary: 'Actualización con nuevas funcionalidades de delivery.',
      changes: [
        { type: 'ADDED', text: 'Soporte para coordenadas en zonas' },
        { type: 'IMPLEMENTED', text: 'Cálculo automático de vueltos' },
        { type: 'FIXED', text: 'Error al imprimir tickets térmicos' },
        { type: 'REMOVED', text: 'Opción deprecada de cobro manual' },
      ],
      isPublished: true,
      publishedAt: new Date('2026-10-20'),
      createdAt: new Date('2026-10-20'),
    },
    {
      id: 'update-2',
      title: 'Versión preliminar en borrador',
      version: 'v1.2.0-draft',
      summary: null,
      changes: [{ type: 'ADDED', text: 'Nuevo módulo en desarrollo' }],
      isPublished: false,
      publishedAt: null,
      createdAt: new Date('2026-10-22'),
    },
  ];

  const mockRepository = {
    find: jest.fn().mockImplementation((query?: any) => {
      if (query?.where?.isPublished === true) {
        return Promise.resolve(mockAppUpdates.filter((u) => u.isPublished));
      }
      return Promise.resolve(mockAppUpdates);
    }),
    findOne: jest.fn().mockImplementation(({ where: { id } }: any) => {
      const found = mockAppUpdates.find((u) => u.id === id);
      return Promise.resolve(found || null);
    }),
    create: jest.fn().mockImplementation((dto: any) => ({
      id: 'update-new',
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
    remove: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppUpdatesController],
      providers: [
        AppUpdatesService,
        {
          provide: getRepositoryToken(AppUpdate),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AppUpdatesService>(AppUpdatesService);
    controller = module.get<AppUpdatesController>(AppUpdatesController);
    jest.clearAllMocks();
  });

  it('debe estar definido el servicio y el controlador', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  describe('getLatestUpdates', () => {
    it('debe devolver únicamente las actualizaciones publicadas limitadas', async () => {
      const res = await controller.getLatestUpdates('10');
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isPublished: true },
        order: { createdAt: 'DESC' },
        take: 10,
      });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('update-1');
    });
  });

  describe('getAllUpdates', () => {
    it('debe devolver todas las actualizaciones para el SuperAdmin', async () => {
      const res = await controller.getAllUpdates();
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(res.length).toBe(2);
    });
  });

  describe('createUpdate', () => {
    it('debe crear y guardar una nueva actualización con cambios categorizados', async () => {
      const dto = {
        title: 'Módulo de Novedades',
        version: 'v1.3.0',
        summary: 'Resumen de prueba',
        changes: [
          { type: 'ADDED' as const, text: 'Pestaña en ayuda y comentarios' },
          { type: 'IMPLEMENTED' as const, text: 'Gestión en superadmin' },
          { type: 'FIXED' as const, text: 'Corrección de márgenes' },
          { type: 'REMOVED' as const, text: 'Banners invasivos eliminados' },
        ],
        isPublished: true,
      };

      const result = await controller.createUpdate(dto);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.title).toBe(dto.title);
      expect(result.changes).toHaveLength(4);
    });
  });

  describe('updateUpdate', () => {
    it('debe actualizar una actualización existente', async () => {
      const result = await controller.updateUpdate('update-1', {
        title: 'Título Modificado',
        isPublished: true,
      });

      expect(result.title).toBe('Título Modificado');
    });

    it('debe lanzar NotFoundException si no existe el ID', async () => {
      await expect(
        service.updateUpdate('non-existent', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUpdate', () => {
    it('debe eliminar la actualización existente', async () => {
      const result = await controller.deleteUpdate('update-1');
      expect(result).toEqual({ success: true });
      expect(mockRepository.remove).toHaveBeenCalled();
    });
  });
});
