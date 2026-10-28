"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { loginAction, acceptInvitationAction, requestPasswordResetAction, resetPasswordAction } from "@/server/actions/auth";
import { invitationAcceptSchema, loginSchema, resetPasswordSchema, resetRequestSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { Alert } from "@/components/ui/primitives";

export function LoginForm() {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  return (
    <form
      className="space-y-4"
      method="post"
      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);
        const result = await loginAction(values);
        if (result && !result.ok) setMessage(result.message);
      })}
      noValidate
    >
      {message ? <Alert tone="danger">{message}</Alert> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="username" {...form.register("email")} />
        <Field name={form.formState.errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        <Field name={form.formState.errors.password?.message} />
      </div>
      <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

export function InvitationForm({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(invitationAcceptSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });
  return (
    <form
      className="space-y-4"
      method="post"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);
        const result = await acceptInvitationAction(values);
        if (result && !result.ok) setMessage(result.message);
      })}
    >
      {message ? <Alert tone="danger">{message}</Alert> : null}
      <input type="hidden" {...form.register("token")} />
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        <Field name={form.formState.errors.password?.message} />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        <Field name={form.formState.errors.confirmPassword?.message} />
      </div>
      <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? "Creating account…" : "Create account"}</Button>
    </form>
  );
}

export function ResetRequestForm() {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(resetRequestSchema), defaultValues: { email: "" } });
  return (
    <form className="space-y-4" method="post" noValidate onSubmit={form.handleSubmit(async (values) => {
      const result = await requestPasswordResetAction(values);
      setMessage(result.ok ? result.message ?? "Request recorded." : result.message);
    })}>
      {message ? <Alert>{message}</Alert> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} />
      </div>
      <Button disabled={form.formState.isSubmitting} type="submit">Request reset</Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: "", confirmPassword: "" } });
  return (
    <form className="space-y-4" method="post" noValidate onSubmit={form.handleSubmit(async (values) => {
      const result = await resetPasswordAction(values);
      if (!result.ok) setMessage(result.message);
      else router.push("/login?reset=1");
    })}>
      {message ? <Alert tone="danger">{message}</Alert> : null}
      <input type="hidden" {...form.register("token")} />
      <div>
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        <Field name={form.formState.errors.password?.message} />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        <Field name={form.formState.errors.confirmPassword?.message} />
      </div>
      <Button disabled={form.formState.isSubmitting} type="submit">Update password</Button>
    </form>
  );
}

function Field({ name }: { name?: string }) {
  if (!name) return null;
  return <p className="mt-1 text-sm text-danger">{name}</p>;
}
