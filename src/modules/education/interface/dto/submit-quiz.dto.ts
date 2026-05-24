import {
  IsObject,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const MAX_ANSWERS = 50;
const MAX_KEY_LENGTH = 64;
const MAX_VALUE_LENGTH = 500;

function IsBoundedAnswersMap(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBoundedAnswersMap',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
          const entries = Object.entries(value as Record<string, unknown>);
          if (entries.length > MAX_ANSWERS) return false;
          for (const [k, v] of entries) {
            if (typeof k !== 'string' || k.length === 0 || k.length > MAX_KEY_LENGTH) return false;
            if (typeof v !== 'string' || v.length === 0 || v.length > MAX_VALUE_LENGTH) return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be an object with at most ${MAX_ANSWERS} entries; each key up to ${MAX_KEY_LENGTH} chars and each value a non-empty string up to ${MAX_VALUE_LENGTH} chars`;
        },
      },
    });
  };
}

export class SubmitQuizDto {
  @IsObject()
  @IsBoundedAnswersMap()
  answers!: Record<string, string>;
}
