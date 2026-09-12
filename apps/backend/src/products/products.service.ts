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

import { ComboItem } from '../entities/combo-item.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(RecipeItem)
    private recipeItemRepo: Repository<RecipeItem>,
    @InjectRepository(ComboItem)
    private comboItemRepo: Repository<ComboItem>,
    private dataSource: DataSource,
  ) {}

  async findAll() {
    const products = await this.productRepo.find({ 
      order: { name: 'ASC' },
      relations: {
        comboItems: { component: true },
        recipe: { rawMaterial: true }
      }
    });

    return products.map(p => {
      // Si es un combo (tiene comboItems), su stock es virtual
      if (p.comboItems && p.comboItems.length > 0) {
        let minPossible = Infinity;

        // Revisar límite por sub-productos
        for (const ci of p.comboItems) {
          const possibleFromComponent = Math.floor((ci.component?.stockQuantity || 0) / ci.quantity);
          if (possibleFromComponent < minPossible) minPossible = possibleFromComponent;
        }

        // Revisar límite por insumos extra de la bandeja (recipe items directos del combo)
        if (p.recipe && p.recipe.length > 0) {
          for (const ri of p.recipe) {
            const possibleFromRaw = Math.floor((ri.rawMaterial?.stockQuantity || 0) / ri.quantity);
            if (possibleFromRaw < minPossible) minPossible = possibleFromRaw;
          }
        }

        p.stockQuantity = minPossible === Infinity ? 0 : minPossible;
      }
      
      // Sanitizar relaciones para no enviar data innecesaria masiva
      const cleanedComboItems = p.comboItems?.map(ci => ({
        id: ci.id,
        componentId: ci.componentId,
        quantity: ci.quantity
      })) || [];

      return {
        ...p,
        comboItems: cleanedComboItems,
        recipe: undefined // Hiding recipe to save bandwidth unless specifically requested
      };
    });
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

  async remove(id: string) {
    await this.findOne(id); // verifica que exista
    await this.productRepo.softDelete(id);
    return { success: true };
  }

  async getRecipeAndCost(id: string) {
    const items = await this.recipeItemRepo.find({
      where: { product: { id } },
      relations: { rawMaterial: true }
    });
    
    const comboItems = await this.comboItemRepo.find({
      where: { comboId: id },
      relations: { component: true }
    });

    let totalCost = 0;
    const formattedRecipeItems = items.map(item => {
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
    
    // Calcular los costos de los sub-productos (recursivo)
    const formattedComboItems = await Promise.all(comboItems.map(async item => {
      // Obtenemos el costo base del componente
      const componentData = await this.getRecipeAndCost(item.componentId);
      const itemCost = item.quantity * componentData.totalRecipeCost;
      totalCost += itemCost;

      return {
        id: item.id,
        componentId: item.componentId,
        componentName: item.component?.name,
        quantity: item.quantity,
        unitCost: componentData.totalRecipeCost,
        totalItemCost: itemCost
      };
    }));

    return {
      items: formattedRecipeItems,
      comboItems: formattedComboItems,
      totalRecipeCost: totalCost
    };
  }

  async updateCombo(id: string, dto: any) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { id } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      // Validaciones de seguridad
      for (const item of dto.comboItems) {
        if (item.componentId === id) {
          throw new BadRequestException('Un producto no puede ser componente de sí mismo');
        }
        const component = await manager.findOne(Product, { where: { id: item.componentId } });
        if (component?.isCombo) {
          throw new BadRequestException('No se pueden agregar combos dentro de otros combos');
        }
      }

      // Eliminar combo viejo
      await manager.delete(ComboItem, { comboId: id });

      // Insertar combo nuevo
      const newItems = dto.comboItems.map((item: any) => {
        return manager.create(ComboItem, {
          combo: product,
          component: { id: item.componentId } as Product,
          quantity: item.quantity
        });
      });

      if (newItems.length > 0) {
        await manager.save(ComboItem, newItems);
      }
      return { success: true };
    });
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

