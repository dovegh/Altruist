// Expo's default Metro config, minus the partner portal.
//
// `partner-portal/` is a separate Next.js app in the same repo with its own
// node_modules (its own React). Metro must never crawl it, or it finds two
// copies of every package.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const portal = path.resolve(__dirname, 'partner-portal').replace(/[/\\]/g, '[/\\\\]');
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  new RegExp(`^${portal}[/\\\\].*`),
];

module.exports = config;
