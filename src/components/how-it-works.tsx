const STEPS = [
  {
    n: "01",
    title: "Search your discipline",
    body: "Pick what you ride and the town you ride in. Every listing is a real coach, not an agency.",
  },
  {
    n: "02",
    title: "Read the profile",
    body: "Qualifications, disciplines, travel radius, testimonials from riders they've taught.",
  },
  {
    n: "03",
    title: "Contact them direct",
    body: "No commission, no booking fee. You deal with your coach, the way riders always have.",
  },
];

/** Homepage "Three steps to a lesson" band — self-contained, no data comes from the page. */
export function HowItWorks() {
  return (
    <section className="bg-ink text-ink-fg">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="max-w-xl text-4xl leading-[1.05] text-ink-fg sm:text-5xl">
          Three steps to a lesson.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="border-t border-ink-fg/35 pt-6">
              <div className="text-2xl text-border">{step.n}</div>
              <div className="mt-3 text-2xl font-medium text-ink-fg">{step.title}</div>
              <p className="mt-2.5 text-[17px] leading-relaxed text-ink-fg/82">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
