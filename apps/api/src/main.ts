import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('app.port', 3000);
    const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
    const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        }),
    );
    app.use(cookieParser());

    const appUrl = configService.get<string>('app.appUrl', 'http://localhost:4200');
    const allowedOrigins =
        nodeEnv === 'production'
            ? [appUrl]
            : [appUrl, 'http://localhost:4200', 'http://127.0.0.1:4200'];

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true); // Postman / server requests
            if (nodeEnv === 'development') return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Gym-Slug'],
    });


    app.setGlobalPrefix(apiPrefix);

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,          // strip unknown props
            forbidNonWhitelisted: true,
            transform: true,          // auto-transform to DTO types
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    if (nodeEnv !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('GymSaaS API')
            .setDescription('Multi-tenant gym management platform')
            .setVersion('1.0')
            .addBearerAuth()
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('docs', app, document);
        console.log(` Swagger available at http://localhost:${port}/docs`);
    }

    await app.listen(port);
    console.log(` GymSaaS API running on http://localhost:${port}/${apiPrefix}`);
}

bootstrap();