const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const SRC = path.resolve(__dirname, '../src')

function jsFiles(folder) {
  return fs
    .readdirSync(path.join(SRC, folder))
    .filter((file) => file.endsWith('.js'))
    .map((file) => ({
      file: `${folder}/${file}`,
      source: fs.readFileSync(path.join(SRC, folder, file), 'utf8'),
    }))
}

function requiresFolder(source, folder) {
  return new RegExp(`require\\(['"]\\.\\./${folder}/`).test(source)
}

// Request flow: Router -> Middleware -> Controller -> Service -> Model.
// Each layer may only talk to the one below it.

test('routes only wire middleware to controllers', () => {
  for (const { file, source } of jsFiles('routes')) {
    assert.equal(
      requiresFolder(source, 'services'),
      false,
      `${file} must not import a service; call it through a controller`,
    )
    assert.equal(
      requiresFolder(source, 'models'),
      false,
      `${file} must not import a model`,
    )
    assert.equal(
      /asyncHandler\(/.test(source),
      false,
      `${file} must not define inline handlers; move them to a controller`,
    )
  }
})

test('controllers never touch the database layer directly', () => {
  for (const { file, source } of jsFiles('controllers')) {
    assert.equal(
      requiresFolder(source, 'models'),
      false,
      `${file} must not import a model; business logic belongs in a service`,
    )
  }
})

test('services never depend on the HTTP layers above them', () => {
  for (const { file, source } of jsFiles('services')) {
    assert.equal(requiresFolder(source, 'controllers'), false, file)
    assert.equal(requiresFolder(source, 'routes'), false, file)
  }
})

test('every router has a matching controller with only function exports', () => {
  const controllers = new Set(
    jsFiles('controllers').map(({ file }) =>
      path.basename(file, '.js').replace(/Controller$/, ''),
    ),
  )

  for (const { file } of jsFiles('routes')) {
    const base = path.basename(file, '.js').replace(/Routes$/, '')
    assert.ok(controllers.has(base), `${file} has no ${base}Controller.js`)
  }

  for (const { file } of jsFiles('controllers')) {
    const exported = require(path.join(SRC, file))
    const entries = Object.entries(exported)

    assert.ok(entries.length > 0, `${file} exports no handlers`)
    for (const [name, handler] of entries) {
      assert.equal(typeof handler, 'function', `${file}#${name}`)
    }
  }
})
