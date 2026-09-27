import { getSupportPhone } from "@/lib/settings";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata = { title: "Reset your password", robots: { index: false, follow: true } };

export default async function ForgotPasswordPage() {
  return <ForgotPasswordForm supportPhone={await getSupportPhone()} />;
}
