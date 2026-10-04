import { IsNotEmpty, IsString } from 'class-validator';

export class NextjsGoogleLoginDto {
  @IsNotEmpty({ message: 'ID token is required' })
  @IsString()
  idToken: string;
}
