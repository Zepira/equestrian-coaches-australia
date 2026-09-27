import { Suspense } from "react";
import { getSupportPhone } from "@/lib/settings";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in", robots: { index: false, follow: true } };

export default async function LoginPage() {
  const supportPhone = await getSupportPhone();
  return (
    <Suspense>
      <LoginForm supportPhone={supportPhone} />
    </Suspense>
  );
}
