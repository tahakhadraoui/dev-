import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import * as dotenv from "dotenv"

async function bootstrap() {
  dotenv.config()
  const app = await NestFactory.create(AppModule)

  // Enable CORS
  app.enableCors()

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  )

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle("Sports Match Reservation API")
    .setDescription("API for sports match reservation platform")
    .setVersion("1.0")
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api", app, document)

  const port = process.env.PORT || 3001

  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`)
}
bootstrap()
