import { z } from "zod";

const sexSchema = z.enum(["FEMALE", "MALE", "UNSPECIFIED"]);

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a real calendar date.")
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    "Birth date cannot be in the future."
  )
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const optionalMeasurement = (maximum: number) =>
  z.number().finite().positive().max(maximum).nullable().optional();

const notesSchema = z
  .union([z.string().trim().max(2_000), z.null()])
  .transform((value) => (value === "" ? null : value))
  .optional();

const childFields = {
  name: z.string().trim().min(1).max(80),
  birthDate: dateOnlySchema,
  sex: sexSchema,
  birthHeightCm: optionalMeasurement(100),
  birthWeightKg: optionalMeasurement(20),
  motherHeightCm: optionalMeasurement(250),
  fatherHeightCm: optionalMeasurement(250),
  notes: notesSchema
};

export const childCreateSchema = z.object(childFields).strict();

export const childUpdateSchema = z
  .object(childFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Submit at least one field."
  });

export type ChildCreateValues = z.output<typeof childCreateSchema>;
export type ChildUpdateValues = z.output<typeof childUpdateSchema>;
