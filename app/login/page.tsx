import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  if (session) redirect(params.redirect ?? "/picks");

  return (
    <div className="max-w-md mx-auto py-8">
      <LoginForm redirectTo={params.redirect ?? "/picks"} />
    </div>
  );
}
