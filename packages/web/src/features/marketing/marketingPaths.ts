const marketingPaths = [
  '/welcome',
  '/districts',
  '/schools',
  '/educators',
  '/families',
  '/students',
  '/curriculum',
  '/readiness',
  '/privacy',
  '/terms',
  '/cookies',
  '/support',
];

export function isMarketingPath(path: string, signedIn: boolean) {
  if (path === '/' && !signedIn) return true;
  return marketingPaths.some(
    marketingPath =>
      path === marketingPath || path.startsWith(`${marketingPath}/`)
  );
}
