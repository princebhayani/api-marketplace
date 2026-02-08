import { redirect } from "next/navigation";

export default async function ProviderApiIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/provider/apis/${id}/overview`);
}
