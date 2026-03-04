export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--color-accent-50)_0%,_var(--color-brand-50)_40%,_#f9fafb_70%)] p-4">
      {children}
    </div>
  );
}
