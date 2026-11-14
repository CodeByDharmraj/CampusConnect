const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const SRC = path.resolve(__dirname, '../src')
const OPENAPI = path.resolve(__dirname, '../../docs/openapi.yaml')
const VERBS = ['get', 'post', 'put', 'patch', 'delete']

// "/courses/:courseId" and "/courses/{id}" are the same route shape.
const normalize = (route) => route.replace(/:[A-Za-z0-9_]+|\{[^}]+\}/g, '{}')

// Routes the server really serves: app.js mount points + each router's stack.
function servedRoutes() {
  const appSource = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8')
  const fileByVariable = new Map(
    [
      ...appSource.matchAll(
        /const\s+(\w+)\s*=\s*require\('\.\/routes\/(\w+)'\)/g,
      ),
    ].map((m) => [m[1], m[2]]),
  )
  const served = new Set([
    'GET /health',
    'GET /health/live',
    'GET /health/ready',
  ])

  for (const [, mount, variable] of appSource
    .matchAll(/app\.use\('\/api\/v1([^']*)',\s*(\w+)\)/g)
    .map((m) => m)) {
    const router = require(
      path.join(SRC, 'routes', fileByVariable.get(variable)),
    )

    for (const layer of router.stack) {
      if (!layer.route) continue
      const full = layer.route.path === '/' ? mount : mount + layer.route.path

      for (const verb of VERBS) {
        if (layer.route.methods[verb]) {
          served.add(`${verb.toUpperCase()} ${normalize(full)}`)
        }
      }
    }
  }

  return served
}

// Minimal, dependency-free read of the "paths:" block of openapi.yaml.
function documentedRoutes() {
  const lines = fs.readFileSync(OPENAPI, 'utf8').split('\n')
  const start = lines.findIndex((line) => line === 'paths:')
  const documented = new Set()
  const pathKeys = []
  let current = null

  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break
    const pathMatch = line.match(/^ {2}'?(\/[^':]*)'?:\s*$/)
    if (pathMatch) {
      current = pathMatch[1]
      pathKeys.push(current)
      continue
    }
    const verbMatch = line.match(/^ {4}(get|post|put|patch|delete):\s*$/)
    if (verbMatch && current) {
      documented.add(`${verbMatch[1].toUpperCase()} ${normalize(current)}`)
    }
  }

  return { documented, pathKeys }
}

test('docs/openapi.yaml documents every route the server serves', () => {
  const missing = [...servedRoutes()].filter(
    (route) => !documentedRoutes().documented.has(route),
  )
  assert.deepEqual(missing, [], `Undocumented routes: ${missing.join(', ')}`)
})

test('docs/openapi.yaml documents no route the server does not serve', () => {
  const served = servedRoutes()
  const phantom = [...documentedRoutes().documented].filter(
    (route) => !served.has(route),
  )
  assert.deepEqual(
    phantom,
    [],
    `Documented but not served: ${phantom.join(', ')}`,
  )
})

test('docs/openapi.yaml has no repeated path keys', () => {
  const { pathKeys } = documentedRoutes()
  const repeated = pathKeys.filter((key, i) => pathKeys.indexOf(key) !== i)
  assert.deepEqual(repeated, [], 'Duplicate YAML keys silently drop operations')
})
