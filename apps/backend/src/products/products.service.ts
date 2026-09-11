import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { RecipeItem } from '../entities/recipe-item.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RegisterLossDto } from '../raw-materials/dto/register-loss.dto';
import { MovementType } from '@nutrideli/shared-types';
import { RawMaterial } from '../entities/raw-material.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(RecipeItem)
    private recipeItemRepo: Repository<RecipeItem>,
    private dataSource: DataSource,
  ) {}

  findAll() {
    return this.productRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async getRecipeAndCost(id: string) {
    const items = await this.recipeItemRepo.find({
      where: { product: { id } },
      relations: { rawMaterial: true }
    });

    let totalCost = 0;
    const formattedItems = items.map(item => {
      const itemCost = item.quantity * (item.rawMaterial?.costPerUnit || 0);
      totalCost += itemCost;
      return {
        id: item.id,
        rawMaterialId: item.rawMaterial.id,
        rawMaterialName: item.rawMaterial.name,
        unit: item.rawMaterial.unit,
        quantity: item.quantity,
        costPerUnit: item.rawMaterial.costPerUnit,
        totalItemCost: itemCost
      };
    });

    return {
      items: formattedItems,
      totalRecipeCost: totalCost
    };
  }

  async updateRecipe(id: string, dto: UpdateRecipeDto) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { id } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      // Eliminar receta vieja
      await manager.delete(RecipeItem, { product: { id } });

      // Insertar receta nueva
      const newItems = dto.items.map(item => {
        return manager.create(RecipeItem, {
          product: product,
          rawMaterial: { id: item.rawMaterialId } as RawMaterial,
          quantity: item.quantity
        });
      });

      if (newItems.length > 0) {
        await manager.save(RecipeItem, newItems);
      }
      return { success: true };
    });
  }

  async registerLoss(id: string, dto: RegisterLossDto) {
    // Para simplificar, en Producto podemos restar directo el stock y opcionalmente guardar en una tabla 'ProductStockMovement'.
    // Como Fase 2, descontamos stock. 
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { id } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      if (product.stockQuantity < dto.quantity) {
        throw new BadRequestException('Stock insuficiente para la merma solicitada');
      }

      product.stockQuantity -= dto.quantity;
      await manager.save(Product, product);

      // Si hubiéramos creado una tabla de ProductStockMovement la registraríamos aquí.
      // Por ahora la pérdida se anota actualizando el stock.

    });
  }

  async adjustStock(id: string, quantity: number) {
    const product = await this.findOne(id);
    product.stockQuantity += quantity;
    return this.productRepo.save(product);
  }
}

