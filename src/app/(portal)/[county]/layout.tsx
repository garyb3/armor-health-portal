import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CountyProvider } from "@/components/county-provider";
import { isValidCountySlug } from "@/lib/counties";

export default async function CountyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ county: string }>;
}) {
  const { county: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();

  if (!isValidCountySlug(slug)) {
    notFound();
  }

  const countyRow = await prisma.county.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayName: true, active: true },
  });

  if (!countyRow || !countyRow.active) {
    notFound();
  }

  return (
    <CountyProvider
      county={{
        id: countyRow.id,
        slug,
        displayName: countyRow.displayName,
      }}
    >
      {children}
    </CountyProvider>
  );
}
