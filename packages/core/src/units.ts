/**
 * Canonical Himalayan Thigse (Thig-tshad) Iconometric Unit System
 *
 * - 1 Sor-mo (Tib. sor-mo, Skt. angula / finger-width) = 8 Yuka (Tib. nas / barley grains)
 * - 1 Tala (Tib. mtho / facial span) = 12 Sor-mo = 96 Yuka
 */

export const YUKA_PER_SOR = 8;
export const SOR_PER_TALA = 12;
export const YUKA_PER_TALA = YUKA_PER_SOR * SOR_PER_TALA; // 96

/**
 * Converts integer/decimal Sor-mo and Yuka (barley-grain) sub-units into decimal Sor-mo.
 */
export function sorAndYukaToSor(sor: number, yuka: number = 0): number {
  return sor + yuka / YUKA_PER_SOR;
}

/**
 * Converts decimal Sor-mo into total Yuka (barley-grains).
 */
export function sorToYuka(sor: number): number {
  return sor * YUKA_PER_SOR;
}

/**
 * Converts total Yuka into decimal Sor-mo.
 */
export function yukaToSor(yuka: number): number {
  return yuka / YUKA_PER_SOR;
}

/**
 * Converts decimal Sor-mo into Tala (12-sor facial spans).
 */
export function sorToTala(sor: number): number {
  return sor / SOR_PER_TALA;
}

/**
 * Converts Tala into Sor-mo.
 */
export function talaToSor(tala: number): number {
  return tala * SOR_PER_TALA;
}

/**
 * Decomposes a decimal Sor-mo value into whole { tala, sor, yuka } components.
 */
export function decomposeSor(totalSor: number): {
  tala: number;
  sor: number;
  yuka: number;
  wholeSor: number;
} {
  const sign = totalSor < 0 ? -1 : 1;
  const absSor = Math.abs(totalSor);
  const wholeSor = Math.floor(absSor + 1e-9);
  const remainderYuka = Math.round((absSor - wholeSor) * YUKA_PER_SOR * 100) / 100;
  const tala = Math.floor(wholeSor / SOR_PER_TALA);
  const sorRemainder = wholeSor % SOR_PER_TALA;

  return {
    tala: sign * tala,
    sor: sign * sorRemainder,
    yuka: remainderYuka,
    wholeSor: sign * wholeSor,
  };
}

/**
 * Formats a decimal Sor-mo measurement in canonical notation, e.g. "12 sor" or "5 sor 2 yuka".
 */
export function formatSorYuka(totalSor: number): string {
  const sign = totalSor < 0 ? '-' : '';
  const absSor = Math.abs(totalSor);
  const wholeSor = Math.floor(absSor + 1e-9);
  const yuka = Math.round((absSor - wholeSor) * YUKA_PER_SOR * 10) / 10;

  if (yuka <= 0.05) {
    return `${sign}${wholeSor} sor`;
  }
  if (wholeSor === 0) {
    return `${sign}${yuka} yuka`;
  }
  return `${sign}${wholeSor} sor ${yuka} yuka`;
}

/**
 * Converts Sor-mo to physical millimeters given a target total canvas height in mm.
 */
export function sorToMillimeters(
  sor: number,
  seatedGridHeightSor: number,
  targetCanvasHeightMm: number
): number {
  if (seatedGridHeightSor <= 0) return 0;
  return (sor / seatedGridHeightSor) * targetCanvasHeightMm;
}
