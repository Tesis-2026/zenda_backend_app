# Receipt OCR Integration

This integration extracts a transaction draft from a receipt/boleta image or PDF.
It does not create a transaction automatically; the mobile app must show the
draft and the user must confirm before saving.

## Endpoint

`POST /api/receipts/analyze`

Authentication: Bearer JWT

Content-Type: `multipart/form-data`

Body:

| Field  | Type            | Required | Notes     |
| ------ | --------------- | -------- | --------- |
| `file` | JPG, PNG or PDF | Yes      | Max 10 MB |

## Environment Variables

```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://zenda-document-intelligence-v2.cognitiveservices.azure.com/"
AZURE_DOCUMENT_INTELLIGENCE_KEY=""
AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID=prebuilt-receipt
AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS=30000
```

Never commit real keys. Keep them in local `.env`, CI/CD secrets, or a secret
manager.

## Flow

```text
Flutter image_picker
  -> Backend multipart upload
  -> Azure AI Document Intelligence prebuilt-receipt
  -> Normalized transaction draft
  -> User reviews and confirms
  -> Existing transaction creation endpoint saves it
```

The ZENDA agent is not used for OCR. OCR is handled by Azure AI Document
Intelligence. After OCR, the backend may use the existing AI provider to suggest
a transaction category from the extracted merchant/items.

## cURL Example

```bash
curl -X POST "http://localhost:3000/api/receipts/analyze" \
  -H "Authorization: Bearer <access-token>" \
  -F "file=@./boleta.jpg;type=image/jpeg"
```

## Response Example

```json
{
  "amount": 12.9,
  "date": "2026-06-23",
  "time": "18:42:00",
  "merchant": "Tambo",
  "tax": 2.32,
  "items": [
    {
      "name": "Galleta",
      "amount": 1,
      "quantity": 1
    }
  ],
  "suggestedCategory": "Food",
  "note": "Compra en Tambo",
  "confidence": 0.91,
  "warnings": []
}
```

## Warnings

The response can include warnings such as:

- `No se detecto el monto total.`
- `No se detecto la fecha de la boleta.`
- `Verifica el monto y la fecha antes de guardar.`

The frontend should keep the form editable so the user can correct any field
before saving.
