import { getSupportPhone } from "@/lib/settings";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Set a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  return <ResetPasswordForm supportPhone={await getSupportPhone()} />;
}
