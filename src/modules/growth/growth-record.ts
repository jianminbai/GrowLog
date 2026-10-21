import { z } from "zod";

const optionalMeasurement = (maximum: number) =>
  z.number().finite().positive().max(maximum).nullable().optional();

const optionalText = (maximum: number) =>
  z
    .union([z.string().trim().max(maximum), z.null()])
    .transform((value) => (value === "" ? null : value))
    .optional();

const measuredAtSchema = z
  .iso.datetime()
  .transform((value) => new Date(value))
  .refine((value) => value.getTime() <= Date.now(), "Measurement time cannot be in the future.");

const growthFields = {
  measuredAt: measuredAtSchema,
  heightCm: optionalMeasurement(250),
  weightKg: optionalMeasurement(300),
  headCircumferenceCm: optionalMeasurement(100),
  source: z.enum(["MANUAL", "HOME", "HOSPITAL", "KINDERGARTEN", "IMPORT"]),
  place: optionalText(120),
  method: optionalText(120),
  device: optionalText(120),
  precisionNote: optionalText(240),
  notes: optionalText(2_000)
};

export const growthCreateSchema = z
  .object(growthFields)
  .strict()
  .superRefine((value, context) => {
    if (
      value.heightCm === undefined || value.heightCm === null
        ? value.weightKg === undefined || value.weightKg === null
          ? value.headCircumferenceCm === undefined || value.headCircumferenceCm === null
          : false
        : false
    ) {
      context.addIssue({
        code: "custom",
        path: ["heightCm"],
        message: "Enter at least one measurement."
      });
    }
  });

export const growthUpdateSchema = z
  .object(growthFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Submit at least one field." });

export type GrowthCreateValues = z.output<typeof growthCreateSchema>;
export type GrowthUpdateValues = z.output<typeof growthUpdateSchema>;

function rounded(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (heightCm === null || weightKg === null || heightCm <= 0 || weightKg <= 0) return null;
  return rounded(weightKg / (heightCm / 100) ** 2, 2);
}

export function calculateGrowthChanges(
  records: Array<{ heightCm: number | null; weightKg: number | null }>
): Array<{ heightChangeCm: number | null; weightChangeKg: number | null }> {
  let previousHeight: number | null = null;
  let previousWeight: number | null = null;

  return records.map((record) => {
    const result = {
      heightChangeCm:
        record.heightCm === null || previousHeight === null
          ? null
          : rounded(record.heightCm - previousHeight, 2),
      weightChangeKg:
        record.weightKg === null || previousWeight === null
          ? null
          : rounded(record.weightKg - previousWeight, 3)
    };
    if (record.heightCm !== null) previousHeight = record.heightCm;
    if (record.weightKg !== null) previousWeight = record.weightKg;
    return result;
  });
}
