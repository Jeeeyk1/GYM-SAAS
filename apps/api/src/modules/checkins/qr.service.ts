import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Member } from '../../database/entities/member.entity';

interface MemberQrPayload {
  type: 'member_checkin';
  memberId: string;
  clientId: string;
}

@Injectable()
export class QrService {
  private readonly qrSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.qrSecret = this.configService.get<string>('app.qrSecret') ?? '';
  }

  async generateMemberQr(
    memberId: string,
    clientId: string,
    memberRepo: Repository<Member>,
  ): Promise<{ token: string; expiresAt: Date }> {
    // Load qrToken fields (select: false by default, so we add them explicitly)
    const member = await memberRepo
      .createQueryBuilder('m')
      .select(['m.id', 'm.qrToken', 'm.qrTokenExpiresAt'])
      .where('m.id = :id', { id: memberId })
      .getOne();

    if (!member) {
      throw new UnauthorizedException('Member not found');
    }

    // Return existing token if still valid
    if (member.qrToken && member.qrTokenExpiresAt && member.qrTokenExpiresAt > new Date()) {
      return { token: member.qrToken, expiresAt: member.qrTokenExpiresAt };
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const token = this.jwtService.sign(
      { type: 'member_checkin', memberId, clientId } satisfies MemberQrPayload,
      { secret: this.qrSecret, expiresIn: '30d' },
    );

    await memberRepo.update(memberId, { qrToken: token, qrTokenExpiresAt: expiresAt });

    return { token, expiresAt };
  }

  validateMemberQr(token: string): { memberId: string; clientId: string } {
    try {
      const payload = this.jwtService.verify<MemberQrPayload>(token, {
        secret: this.qrSecret,
      });

      if (payload.type !== 'member_checkin') {
        throw new UnauthorizedException('Invalid QR token type');
      }

      return { memberId: payload.memberId, clientId: payload.clientId };
    } catch {
      throw new UnauthorizedException('Invalid or expired QR token');
    }
  }

  getGymQrPayload(slug: string): string {
    return JSON.stringify({ type: 'gym_checkin', slug });
  }
}
