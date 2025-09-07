import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import  { ConfigService } from "@nestjs/config"
import  { UsersService } from "../../users/users.service"
import  { Request } from "express"
import * as bcrypt from "bcrypt"

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_REFRESH_SECRET"),
      passReqToCallback: true,
    })
  }

  async validate(req: Request, payload: any) {
    const refreshToken = (req.headers.authorization ?? "").replace("Bearer ", "")
    const user = await this.usersService.findOne(payload.sub, { relations: ["joinedMatches", "teams", "receivedRatings"] })

    if (!user.refreshToken) {
      throw new UnauthorizedException("Invalid refresh token")
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken)

    if (!refreshTokenMatches) {
      throw new UnauthorizedException("Invalid refresh token")
    }

    return { id: payload.sub, email: payload.email, role: payload.role }
  }
}
