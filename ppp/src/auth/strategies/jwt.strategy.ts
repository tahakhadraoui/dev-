import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import  { ConfigService } from "@nestjs/config"
import  { UsersService } from "../../users/users.service"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_SECRET", "supersecret"),
    })
  }

  // Removed duplicate validate method to resolve the error
  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
  
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
  
    if (!user.isActive) {
      throw new UnauthorizedException('Your account is not active. Please wait for admin approval.');
    }
  
    return user;
  }
  
}
