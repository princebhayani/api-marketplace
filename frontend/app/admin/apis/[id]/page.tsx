import { redirect } from "next/navigation";

export default async function AdminApiIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/apis/${id}/overview`);
}
