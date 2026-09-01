const GRADIENT_WASH =
  "linear-gradient(180deg, rgba(13,24,18,0.34) 0%, rgba(13,24,18,0) 34%, rgba(31,58,46,0.55) 80%, rgba(31,58,46,1) 100%), " +
  "linear-gradient(90deg, rgba(13,24,18,0.5) 0%, rgba(13,24,18,0.15) 45%, rgba(13,24,18,0) 70%)";

/**
 * Full-bleed hero photo with a dark gradient wash, so light text stays
 * readable over it at every breakpoint. Sits behind the fixed, initially
 * transparent site header too — see `useHeaderAppearance`.
 */
export function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- static local asset used as a full-bleed background, next/image adds nothing here */}
      <img
        src="/hero-coach.jpg"
        alt="A white horse cantering across a paddock at golden hour"
        className="h-full w-full object-cover object-[72%_62%] sm:object-[80%_55%] lg:object-[86%_52%]"
      />
      <div className="absolute inset-0" style={{ background: GRADIENT_WASH }} />
    </div>
  );
}
