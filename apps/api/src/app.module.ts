import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { dataSourceOptions } from './database/data-source';
import { Branch } from './database/entities/branch.entity';
import { Organization } from './database/entities/organization.entity';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { MembersModule } from './modules/members/members.module';
import { CheckInsModule } from './modules/checkins/checkins.module';
import { EmailModule } from './modules/email/email.module';
import { StaffModule } from './modules/staff/staff.module';
import { FeaturesModule } from './modules/features/features.module';
import { BranchesModule } from './modules/branches/branches.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
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
    TypeOrmModule.forFeature([Organization, Branch]),

    // ─── Domain modules ───────────────────────────────────────────────────────
    EmailModule,
    AuthModule,
    AdminModule,
    OrganizationsModule,
    MembersModule,
    CheckInsModule,
    StaffModule,
    FeaturesModule,
    BranchesModule,
    SubscriptionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
