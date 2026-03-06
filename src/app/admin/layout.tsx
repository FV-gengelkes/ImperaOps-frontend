export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B1F3B] text-steel-white">
      {children}
    </div>
  );
}
