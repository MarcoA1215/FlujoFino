import { Public } from './public.decorator';
import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request, Param, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from '@nutrideli/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    const result = await this.authService.validateUser(body.username, body.password, body.tenantId);
    if (!result) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if ((result as any).requiresApproval) {
      return result;
    }
    const tokenData = await this.authService.login(result.user, result.tenantId || '', result.role, result.tenantName, result.roles);
    return { ...tokenData, workspaces: result.workspaces };
  }

  @Public()
  @Get('access-request/:id')
  async getAccessRequestStatus(@Param('id') id: string) {
    return this.authService.getAccessRequestStatus(id);
  }

  @Public()
  @Post('register')
  async register(@Body() body: any) {
    return this.authService.registerTenant(body);
  }

  @Public()
  @Post('send-verification')
  async sendVerification(@Body() body: { email: string; username?: string }) {
    if (!body.email && !body.username) {
      throw new BadRequestException('Debes proporcionar el correo o nombre de usuario');
    }
    return this.authService.sendVerificationCode(body.email, body.username);
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; code: string }) {
    if (!body.email || !body.code) {
      throw new BadRequestException('Correo y código son requeridos');
    }
    return this.authService.verifyEmail(body.email, body.code);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
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
    if (result.requiresApproval) {
      return result;
    }
    const tokenData = await this.authService.login(result.user, result.tenantId, result.role, result.tenantName, result.roles);
    return { ...tokenData, workspaces: result.workspaces };
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-mode')
  async switchMode(@Request() req, @Body() body: { targetRole: UserRole }) {
    if (!body?.targetRole) {
      throw new BadRequestException('targetRole es requerido');
    }
    return this.authService.switchMode(req.user.id, req.user.tenantId, body.targetRole, req.user);
  }
}
