export type FieldErrors = Record<string, string[]>;

export type Success<T> = {
  data: T;
};

export type Failure = {
  error: {
    code: string;
    message: string;
    fields?: FieldErrors;
  };
  status: number;
};

export function ok<T>(data: T): Success<T> {
  return { data };
}

export function problem(
  code: string,
  message: string,
  status: number,
  fields?: FieldErrors
): Failure {
  return {
    error: {
      code,
      message,
      ...(fields ? { fields } : {})
    },
    status
  };
}

