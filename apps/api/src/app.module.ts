import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { dataSourceOptions } from './database/data-source';
import { Client } from './database/entities/client.entity';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClientsModule } from './modules/clients/clients.module';
import { MembersModule } from './modules/members/members.module';
import { CheckInsModule } from './modules/checkins/checkins.module';
import { EmailModule } from './modules/email/email.module';
import { StaffModule } from './modules/staff/staff.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

@Module({
  imports: [
    // ─── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),

    // ─── Task scheduling (auto-checkout cron) ────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── TypeORM ─────────────────────────────────────────────────────────────
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([Client]),

    // ─── Domain modules ───────────────────────────────────────────────────────
    EmailModule,
    AuthModule,
    AdminModule,
    ClientsModule,
    MembersModule,
    CheckInsModule,
    StaffModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
