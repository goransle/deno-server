export function ensureStandardsModeStatusHtml(fileContent: string): string {
  const trimmedFileContent = fileContent.trimStart();
  if (/^<!doctype html>/i.test(trimmedFileContent)) {
    if (/<head>/i.test(trimmedFileContent)) {
      return fileContent.replace(/<head>/i, `<head><style>html,body{background:transparent;color-scheme:dark;}</style>`);
    }

    return fileContent;
  }

  if (/^<html[\s>]/i.test(trimmedFileContent)) {
    return `<!DOCTYPE html>${fileContent}`;
  }

  const statusMessagesDocumentHead = '<head><meta charset="UTF-8" /><style>html,body{background:transparent;color-scheme:dark;}</style></head>';

  return `<!DOCTYPE html><html lang=\"en\">${statusMessagesDocumentHead}<body>${fileContent}</body></html>`;
}

export function decodePathnameSafely(pathname: string): string | null {
  let decodedPathname = pathname;

  for (let i = 0; i < 5; i++) {
    try {
      const nextDecodedPathname = decodeURIComponent(decodedPathname);
      if (nextDecodedPathname === decodedPathname) {
        return decodedPathname;
      }

      decodedPathname = nextDecodedPathname;
    } catch {
      return null;
    }
  }

  return decodedPathname;
}

export function parseCoordinates(url: URL) {
  const latParamRaw = url.searchParams.get("lat");
  const lonParamRaw = url.searchParams.get("lon");

  if (latParamRaw === null || lonParamRaw === null) {
    return {};
  }

  const latParam = latParamRaw.trim();
  const lonParam = lonParamRaw.trim();

  if (latParam.length === 0 || lonParam.length === 0) {
    return {};
  }

  const lat = Number(latParam);
  const lon = Number(lonParam);
  const hasFiniteCoordinates = Number.isFinite(lat) && Number.isFinite(lon);
  const coordinatesWithinRange = lat >= -90 && lat <= 90 && lon >= -180 &&
    lon <= 180;

  if (!hasFiniteCoordinates || !coordinatesWithinRange) {
    return {};
  }

  return {
    userLat: lat,
    userLon: lon,
  };
}
