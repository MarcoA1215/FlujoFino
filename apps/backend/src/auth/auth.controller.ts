import { Public } from './public.decorator';
import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request, Param, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    const result = await this.authService.validateUser(body.username, body.password, body.tenantId);
    if (!result) {
      throw new UnauthorizedException('Credenciales inválidas o fuera de horario');
    }
    const tokenData = await this.authService.login(result.user, result.tenantId || '', result.role, result.tenantName);
    return { ...tokenData, workspaces: result.workspaces };
  }
  @Public()
  @Post('register')
  async register(@Body() body: any) {
    return this.authService.registerTenant(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:tenantId/accept')
  async acceptInvite(@Request() req, @Param('tenantId') tenantId: string) {
    try {
      await this.authService['usersService'].acceptInvite(req.user.id, tenantId);
      return { success: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:tenantId/reject')
  async rejectInvite(@Request() req, @Param('tenantId') tenantId: string) {
    try {
      await this.authService['usersService'].rejectInvite(req.user.id, tenantId);
      return { success: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('workspaces')
  async getWorkspaces(@Request() req) {
    return this.authService.getWorkspaces(req.user.username);
  }

  @UseGuards(JwtAuthGuard)
  @Post('select-workspace')
  async selectWorkspace(@Request() req, @Body() body: { tenantId: string }) {
    // Re-validate to get specific tenant details
    const result = await this.authService.validateUserToken(req.user.username, body.tenantId);
    const tokenData = await this.authService.login(result.user, result.tenantId, result.role, result.tenantName);
    return { ...tokenData, workspaces: result.workspaces };
  }
}
