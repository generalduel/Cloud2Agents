interface PolicyLayoutProps {
  children: React.ReactNode;
}

export default function PolicyLayout({ children }: PolicyLayoutProps) {
  return (
    <article className="py-16 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-4xl prose-h1:md:text-5xl prose-h2:text-2xl prose-h2:md:text-3xl prose-a:text-primary prose-a:transition-colors">
          {children}
        </div>
      </div>
    </article>
  );
} 