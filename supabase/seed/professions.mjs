// Seed for the nine professions (The Site as a CMS §04 A-C), used by
// scripts/db/rebuild.mjs. Carried over from what the code held on 24 Sep 2026
// (src/lib/professions.ts, the coaches and horse care pages, the mock
// professionals' specialities) so nothing on screen changes when the site
// starts reading these rows. After the rebuild, admin owns all of it.

const COACH_STEPS = [
  { title: "Tell us what you ride, and where", body: "Pick your discipline and your town. Every listing is a real coach, not an agency." },
  { title: "Read their profile", body: "Qualifications, disciplines, how far they travel, and words from riders they've taught." },
  { title: "Get in touch, direct", body: "No commission, no booking fee. You deal with your coach the way riders always have." },
];

const HORSE_CARE_STEPS = [
  { title: "Tell us what your horse needs, and where", body: "Pick the kind of help and the suburb your horse lives in. Every listing is a real person, not a booking agency." },
  { title: "See who covers your paddock", body: "Each professional sets their own travel radius and lists the work they actually do." },
  { title: "Get in touch, direct", body: "No commission and no booking fee. You sort out the visit with them yourself." },
];

const VISIT_OPTIONS = [
  { value: "regular", label: "Regular visits" },
  { value: "one_off", label: "One-off visit" },
];

// Completeness items (§08.3). `key` is what the dashboard checks; label and
// weight are the profession's to change.
const completeness = (termLabel, photoLabel) => [
  { key: "photo", label: photoLabel, weight: 1 },
  { key: "bio", label: "Bio written", weight: 1 },
  { key: "terms", label: termLabel, weight: 1 },
  { key: "location", label: "Location set", weight: 1 },
  { key: "testimonials", label: "Three testimonials", weight: 1 },
  { key: "video", label: "Intro video", weight: 1 },
];

const horseCare = (p) => ({
  door: "horse_care",
  term_noun: "speciality",
  term_noun_plural: "specialities",
  audience_noun: "horse owner",
  years_label: "years in practice",
  enquiry_options: VISIT_OPTIONS,
  steps: HORSE_CARE_STEPS,
  completeness: completeness("Specialities tagged", "A photo of you at work"),
  remote_allowed: false,
  ...p,
});

export const PROFESSIONS = [
  {
    slug: "coaches",
    name: "Riding coaches",
    blurb: "Coaches for every discipline, from first lessons to competition.",
    door: "coaches",
    glyph_key: "coaches",
    singular: "coach",
    plural: "coaches",
    short_name: null,
    term_noun: "discipline",
    term_noun_plural: "disciplines",
    audience_noun: "rider",
    years_label: "years coaching",
    job_title: "Riding coach",
    hero_headline: "Find a coach for",
    hero_lead: "Search riding coaches across Australia by what you ride and where you are. Free for riders, always.",
    hero_lead_short: "Search by what you ride and where you are. Free for riders, always.",
    steps: COACH_STEPS,
    enquiry_options: [
      { value: "regular", label: "Regular lessons" },
      { value: "one_off", label: "One-off" },
      { value: "clinic", label: "Clinic" },
    ],
    completeness: completeness("Disciplines tagged", "A photo of you coaching"),
    remote_allowed: true,
    aliases: ["riding instructor", "riding instructors", "riding teacher", "horse riding lessons", "riding lessons"],
    specialities: null, // the existing 19 disciplines, from the export
  },
  horseCare({
    slug: "farriers",
    name: "Farriers",
    blurb: "Trimming, shoeing and remedial work, on a cycle that suits your horse.",
    glyph_key: "farriers",
    singular: "farrier",
    plural: "farriers",
    years_label: "years shoeing",
    job_title: "Farrier",
    hero_headline: "Find a farrier who'll come to you.",
    hero_lead: "Search by what your horse needs and where it lives. Barefoot trims, remedial work, hot and cold shoeing.",
    aliases: ["shoer", "horse shoer", "blacksmith", "hoof trimmer", "barefoot trimmer", "trimmer"],
    specialities: ["Barefoot trimming", "Hot shoeing", "Cold shoeing", "Remedial shoeing", "Foal trims", "Glue-on shoes"],
  }),
  horseCare({
    slug: "vets",
    name: "Vets",
    blurb: "Equine veterinary practices, from routine care to lameness work-ups.",
    glyph_key: "vets",
    singular: "vet",
    plural: "vets",
    job_title: "Equine veterinarian",
    aliases: ["equine vet", "horse vet", "veterinarian", "equine veterinarian", "large animal vet"],
    specialities: ["Lameness work-ups", "Pre-purchase exams", "Vaccinations and worming", "Reproduction", "Sedated dentals", "After-hours callouts"],
  }),
  horseCare({
    slug: "physiotherapists",
    name: "Physiotherapists",
    short_name: "Physios",
    blurb: "Rehabilitation and movement work, usually alongside your vet.",
    glyph_key: "physiotherapists",
    singular: "physiotherapist",
    plural: "physiotherapists",
    job_title: "Equine physiotherapist",
    aliases: ["physio", "equine physio", "equine physiotherapist", "animal physio"],
    specialities: ["Rehab after injury", "Pre-competition checks", "Laser and ultrasound", "Exercise programs", "Horse and rider assessments"],
  }),
  horseCare({
    slug: "bodyworkers",
    name: "Bodyworkers",
    blurb: "Massage, myofunctional and soft-tissue therapists.",
    glyph_key: "bodyworkers",
    singular: "bodyworker",
    plural: "bodyworkers",
    job_title: "Equine bodyworker",
    aliases: ["equine massage", "horse massage", "equine massage therapist", "equine bodywork", "myofunctional therapist"],
    specialities: ["Sports massage", "Myofascial release", "Stretching programs", "Kinesiology taping", "Pre-event massage"],
  }),
  horseCare({
    slug: "chiropractors",
    name: "Chiropractors",
    blurb: "Equine chiropractic and osteopathic adjustment.",
    glyph_key: "chiropractors",
    singular: "chiropractor",
    plural: "chiropractors",
    job_title: "Equine chiropractor",
    aliases: ["equine chiropractor", "horse chiropractor", "equine osteopath", "animal chiropractor"],
    specialities: ["Spinal assessment", "Pelvic alignment", "Poll and jaw work", "Performance checks", "Post-injury follow-up"],
  }),
  horseCare({
    slug: "dentists",
    name: "Dentists",
    blurb: "Routine dentistry and equine dental technicians.",
    glyph_key: "dentists",
    singular: "dentist",
    plural: "dentists",
    job_title: "Equine dentist",
    aliases: ["equine dentist", "horse dentist", "equine dental technician", "horse teeth"],
    specialities: ["Routine floats", "Power dentistry", "Young horse first checks", "Wolf teeth", "Senior horse care"],
  }),
  horseCare({
    slug: "saddle-fitters",
    name: "Saddle fitters",
    blurb: "Fitting, flocking and assessment, at home or at a clinic.",
    glyph_key: "saddle-fitters",
    singular: "saddle fitter",
    plural: "saddle fitters",
    job_title: "Saddle fitter",
    aliases: ["saddle fitting", "saddle fitter", "saddler", "saddle flocking"],
    specialities: ["Fitting at home", "Reflocking", "Flexible and treeless", "Western saddles", "Pressure mapping"],
  }),
  horseCare({
    slug: "nutritionists",
    name: "Nutritionists",
    blurb: "Feed and condition advice for the work your horse is actually doing.",
    glyph_key: "nutritionists",
    singular: "nutritionist",
    plural: "nutritionists",
    job_title: "Equine nutritionist",
    remote_allowed: true,
    aliases: ["equine nutritionist", "horse nutritionist", "feed advice", "horse feed consultant"],
    specialities: ["Feed plans", "Weight management", "Performance diets", "Laminitis-prone horses", "Senior horse diets"],
  }),
];

// Setup terms every profession can use (parent_id null). The rest of today's
// skills and attributes are coaching's.
export const SHARED_ATTRIBUTE_SLUGS = ["weekend-availability", "weekday-availability", "insured", "first-aid-certified"];
export const NEW_SHARED_ATTRIBUTES = [
  { slug: "mobile-service", name: "Mobile service", blurb: "Comes to your property." },
  { slug: "after-hours", name: "After-hours service", blurb: "Available outside business hours." },
];

// Coaches nav picks (was topDisciplineSlugs in src/lib/disciplines.ts).
export const FEATURED_DISCIPLINES = [
  "dressage", "show-jumping", "eventing", "western", "pony-club", "liberty", "natural-horsemanship", "trail-riding",
];
