import { redirect } from "next/navigation";

export default async function ProviderApiViewRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/provider/apis/${id}/overview`);
}
