import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { memoryStorage } from "multer";
import {
  ApiAuthErrors,
  ApiOk,
  ApiValidationError,
} from "../../../shared/swagger/api-responses.decorator";
import { JwtAuthGuard } from "../../auth/infrastructure/jwt-auth.guard";
import { ReceiptOcrService } from "../application/receipt-ocr.service";
import { ReceiptAnalyzeResponseDto } from "./dto/receipt-analyze-response.dto";
import { ReceiptUploadExceptionFilter } from "./filters/receipt-upload-exception.filter";

const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

@ApiTags("Receipts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("receipts")
export class ReceiptsController {
  constructor(private readonly receiptOcr: ReceiptOcrService) {}

  @Post("analyze")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseFilters(ReceiptUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_RECEIPT_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_RECEIPT_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              "Formato no permitido. Sube una imagen JPG, PNG o un PDF.",
            ) as unknown as Error,
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: "Analyze receipt or invoice image and return a transaction draft",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "JPG, PNG or PDF receipt file. Max 10 MB.",
        },
      },
    },
  })
  @ApiOk(ReceiptAnalyzeResponseDto, "Receipt analysis draft")
  @ApiValidationError()
  @ApiAuthErrors()
  async analyze(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ReceiptAnalyzeResponseDto> {
    if (!file) {
      throw new BadRequestException("El archivo de boleta es obligatorio.");
    }
    if (!ALLOWED_RECEIPT_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Formato no permitido. Sube una imagen JPG, PNG o un PDF.",
      );
    }
    if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        "El archivo supera el tamano maximo permitido de 10 MB.",
      );
    }

    return this.receiptOcr.analyze(file);
  }
}
