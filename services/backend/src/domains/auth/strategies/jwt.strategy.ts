import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/services/users.service';

export interface JwtPayload {
  sub: string; // user id
  phone: string;
  deviceId?: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    // Validate that the user still exists and is active
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      return null;
    }

    // Return user info and session details
    return {
      userId: payload.sub,
      phone: payload.phone,
      deviceId: payload.deviceId,
      sessionId: payload.sessionId,
      user,
    };
  }
}
