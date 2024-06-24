import { esbuildPlugin } from '@web/dev-server-esbuild'

export default {
  plugins: [esbuildPlugin({ loaders: { '.js': 'ts' }, target: 'auto', tsconfig: 'jsconfig.json' })],
}
