import { PageContent } from "./page-content"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <PageContent id={id} />
}
