// Renders one or more JSON-LD <script> tags. Server component — no
// hydration needed, this is pure markup for crawlers.
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        // JSON.stringify of our own schema objects, never user-supplied HTML.
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </>
  );
}
