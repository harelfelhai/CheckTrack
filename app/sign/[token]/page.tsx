import RemoteSign from "@/components/RemoteSign";

// Public page (no auth) — external supplier signature interface (spec §4, מסך 3).
export default async function RemoteSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <RemoteSign token={token} />
    </main>
  );
}
