/** "CASTLEMAINE" / "mount macedon" → "Castlemaine" / "Mount Macedon". The
 *  postcodes dataset stores suburbs in caps; every place that shows one to a
 *  rider goes through here. */
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
