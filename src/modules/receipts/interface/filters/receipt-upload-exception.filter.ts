import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Response, Request } from "express";
import { MulterError } from "multer";

@Catch(MulterError)
export class ReceiptUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isTooLarge = exception.code === "LIMIT_FILE_SIZE";
    const status = isTooLarge
      ? HttpStatus.PAYLOAD_TOO_LARGE
      : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      message: isTooLarge
        ? "El archivo supera el tamano maximo permitido de 10 MB."
        : "No se pudo procesar el archivo enviado.",
      error: isTooLarge ? "PayloadTooLarge" : "BadRequest",
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
