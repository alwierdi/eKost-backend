import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from 'src/common/http/response.interceptor';
import { AllExceptionsFilter } from 'src/common/http/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    credentials: true,
    origin: '*',
  });

  await app.listen(process.env.PORT ?? 2000);
}
bootstrap();
