import HomePage from "@/components/HomePage";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HomePage />
      {children}
    </>
  );
}
