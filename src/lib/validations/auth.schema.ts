import { z } from "zod";

const passwordFields = {
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
};

const passwordMatchRefine = {
  refine: (data: { password: string; confirmPassword: string }) =>
    data.password === data.confirmPassword,
  message: "Passwords don't match" as const,
  path: ["confirmPassword"] as const,
};

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    ...passwordFields,
  })
  .refine(passwordMatchRefine.refine, {
    message: passwordMatchRefine.message,
    path: [...passwordMatchRefine.path],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordConfirmSchema = z
  .object(passwordFields)
  .refine(passwordMatchRefine.refine, {
    message: passwordMatchRefine.message,
    path: [...passwordMatchRefine.path],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordConfirmInput = z.infer<typeof resetPasswordConfirmSchema>;
