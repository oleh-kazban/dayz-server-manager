import { passwordSchema, usernameSchema } from '@aegis/api-contracts';

export interface SetupFormValues extends Record<string, string> {
  username: string;
  password: string;
  confirmPassword: string;
}

export function validateSetupForm({
  username,
  password,
  confirmPassword,
}: SetupFormValues): Partial<Record<keyof SetupFormValues, string>> {
  const errors: Partial<Record<keyof SetupFormValues, string>> = {};

  const usernameResult = usernameSchema.safeParse(username);
  if (username === '') errors.username = 'Username is required';
  else if (!usernameResult.success) errors.username = usernameResult.error.issues[0]?.message;

  const passwordResult = passwordSchema.safeParse(password);
  if (password === '') errors.password = 'Password is required';
  else if (!passwordResult.success) errors.password = passwordResult.error.issues[0]?.message;
  else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

  return errors;
}
