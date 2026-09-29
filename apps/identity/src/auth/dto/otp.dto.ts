import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

const OTP_PURPOSES = ['login', 'verify_phone', 'verify_email', 'mfa'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export class OtpRequestDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: OTP_PURPOSES })
  @IsIn(OTP_PURPOSES)
  purpose!: OtpPurpose;
}

export class OtpVerifyDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: OTP_PURPOSES })
  @IsIn(OTP_PURPOSES)
  purpose!: OtpPurpose;

  @ApiProperty({ example: '123456' })
  @IsString()
  code!: string;
}
