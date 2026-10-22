import { Controller, Request, Get, Post, Put, Patch, Delete, Body, Param, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RegisterLossDto } from '../raw-materials/dto/register-loss.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { ConvertProductTypeDto } from './dto/convert-product-type.dto';

import { StorageService } from '../storage/storage.service';
import { safeImageUploadOptions } from '../common/utils/multer-options';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService
  ) {}

  @Post('upload-media')
  @UseInterceptors(FileInterceptor('file', safeImageUploadOptions))
  async uploadMedia(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const url = await this.storageService.uploadFile(file, `tenant-${req.user.tenantId}/products`);
    return { url };
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', safeImageUploadOptions))
  async uploadImage(@Request() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    console.log(`[ProductsController.uploadImage] 📥 Solicitud de carga de imagen para Producto ID="${id}", Tenant="${req.user?.tenantId}"`);
    if (!file) throw new BadRequestException('File is required');
    
    // Check if product exists first
    const product = await this.productsService.findOne(req.user.tenantId, id);
    if (!product) throw new BadRequestException('Product not found');

    const url = await this.storageService.uploadFile(file, `tenant-${req.user.tenantId}/products`);
    
    // Add image URL to product
    const images = product.images || [];
    images.push(url);
    await this.productsService.update(req.user.tenantId, id, { images } as any);
    console.log(`[ProductsController.uploadImage] ✅ Imagen asignada correctamente al producto "${product.name}" (${id}): ${url}`);

    return { url, images };
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', 10, safeImageUploadOptions))
  async uploadMultipleImages(@Request() req: any, @Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) throw new BadRequestException('Files are required');

    const product = await this.productsService.findOne(req.user.tenantId, id);
    if (!product) throw new BadRequestException('Product not found');

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const url = await this.storageService.uploadFile(file, `tenant-${req.user.tenantId}/products`);
      uploadedUrls.push(url);
    }

    const images = [...(product.images || []), ...uploadedUrls];
    await this.productsService.update(req.user.tenantId, id, { images } as any);
    return { urls: uploadedUrls, images };
  }

  @Delete(':id/image')
  async removeImage(@Request() req: any, @Param('id') id: string, @Body('url') url: string) {
    const product = await this.productsService.findOne(req.user.tenantId, id);
    if (!product) throw new BadRequestException('Product not found');

    const images = (product.images || []).filter(img => img !== url);
    await this.productsService.update(req.user.tenantId, id, { images } as any);
    return { images };
  }

  @Post(':id/unpack')
  unpackKit(@Request() req: any, @Param('id') id: string) {
    return this.productsService.unpackKit(req.user.tenantId, id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.productsService.findAll(req.user.tenantId);
  }

  @Get('archived')
  findArchived(@Request() req: any) {
    return this.productsService.findArchived(req.user.tenantId);
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

  @Patch(':id/restore')
  restore(@Request() req: any, @Param('id') id: string) {
    return this.productsService.restore(req.user.tenantId, id);
  }

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

  @Patch(':id/add-stock')
  addStock(@Request() req: any, @Param('id') id: string, @Body() dto: AddStockDto) {
    return this.productsService.addStock(req.user.tenantId, id, dto);
  }

  @Patch(':id/convert-type')
  convertType(@Request() req: any, @Param('id') id: string, @Body() dto: ConvertProductTypeDto) {
    return this.productsService.convertProductType(req.user.tenantId, id, dto);
  }

  @Get('migrate-stock')
  migratePhysicalStock(@Request() req: any) {
    return this.productsService.migratePhysicalStock(req.user.tenantId);}

}
