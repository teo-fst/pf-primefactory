import { redirect } from "@/i18n/navigation";
import { initAdminPage } from "@/lib/admin/page";

type Props = { params: Promise<{ locale: string }> };

export default async function ContentIndexPage({ params }: Props) {
  const { locale } = await initAdminPage(params);
  redirect({ href: "/admin/contenuti/testi", locale });
}
