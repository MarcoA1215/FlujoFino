import { Controller, Request, Get, Post, Put, Delete, Body, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RegisterLossDto } from '../raw-materials/dto/register-loss.dto';

import { StorageService } from '../storage/storage.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService
  ) {}

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@Request() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    
    // Check if product exists first
    const product = await this.productsService.findOne(req.user.tenantId, id);
    if (!product) throw new BadRequestException('Product not found');

    const url = await this.storageService.uploadFile(file, `tenant-${req.user.tenantId}/products`);
    
    // Add image URL to product
    const images = product.images || [];
    images.push(url);
    await this.productsService.update(req.user.tenantId, id, { images } as any);

    return { url };
  }

  @Post(':id/unpack')
  unpackKit(@Request() req: any, @Param('id') id: string) {
    return this.productsService.unpackKit(req.user.tenantId, id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.productsService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.tenantId, dto);}

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(req.user.tenantId, id, dto);}

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.productsService.remove(req.user.tenantId, id);}

  @Get(':id/recipe')
  getRecipe(@Request() req: any, @Param('id') id: string) {
    return this.productsService.getRecipeAndCost(req.user.tenantId, id);}

  @Put(':id/recipe')
  updateRecipe(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.productsService.updateRecipe(req.user.tenantId, id, dto);}

  @Put(':id/combo')
  updateCombo(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.productsService.updateCombo(req.user.tenantId, id, dto);}

  @Post(':id/loss')
  registerLoss(@Request() req: any, @Param('id') id: string, @Body() dto: RegisterLossDto) {
    return this.productsService.registerLoss(req.user.tenantId, id, dto);}

  @Post(':id/adjust-stock')
  adjustStock(@Request() req: any, @Param('id') id: string, @Body('quantity') quantity: number) {
    return this.productsService.adjustStock(req.user.tenantId, id, quantity);}

  @Get('migrate-stock')
  migratePhysicalStock(@Request() req: any) {
    return this.productsService.migratePhysicalStock(req.user.tenantId);}

}
