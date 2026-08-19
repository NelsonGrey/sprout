const marketingPaths = [
  '/welcome',
  '/districts',
  '/schools',
  '/educators',
  '/families',
  '/students',
  '/curriculum',
  '/readiness',
];

export function isMarketingPath(path: string, signedIn: boolean) {
  if (path === '/' && !signedIn) return true;
  return marketingPaths.some(
    marketingPath =>
      path === marketingPath || path.startsWith(`${marketingPath}/`)
  );
}
