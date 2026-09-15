import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RegisterLossDto } from '../raw-materials/dto/register-loss.dto';

@Controller('products')
export class ProductsController {
  @Post(':id/unpack')
  async unpackKit(@Param('id') id: string) {
    return this.productsService.unpackKit(id);
  }

  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get(':id/recipe')
  getRecipe(@Param('id') id: string) {
    return this.productsService.getRecipeAndCost(id);
  }

  @Put(':id/recipe')
  updateRecipe(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.productsService.updateRecipe(id, dto);
  }

  @Put(':id/combo')
  updateCombo(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.updateCombo(id, dto);
  }

  @Post(':id/loss')
  registerLoss(@Param('id') id: string, @Body() dto: RegisterLossDto) {
    return this.productsService.registerLoss(id, dto);
  }

  @Post(':id/adjust-stock')
  adjustStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.productsService.adjustStock(id, quantity);
  }

  @Get('migrate-stock')
  migratePhysicalStock() {
    return this.productsService.migratePhysicalStock();
  }

}