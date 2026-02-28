import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { dataSourceOptions } from './database/data-source';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClientsModule } from './modules/clients/clients.module';
import { MembersModule } from './modules/members/members.module';
import { CheckInsModule } from './modules/checkins/checkins.module';

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

    // ─── Domain modules ───────────────────────────────────────────────────────
    AuthModule,
    AdminModule,
    ClientsModule,
    MembersModule,
    CheckInsModule,
    // FeaturesModule,  ← Phase 1.4
  ],
})
export class AppModule {}
