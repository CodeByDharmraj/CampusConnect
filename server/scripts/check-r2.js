const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const env = require('../src/config/env')

async function main() {
  if (!env.R2_ENABLED) {
    console.error(
      'R2 is not configured. Set all five R2_* variables in server/.env.',
    )
    process.exit(1)
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })

  const key = `healthcheck/${Date.now()}.txt`
  const body = 'campusconnect r2 check'

  console.log(`Bucket: ${env.R2_BUCKET_NAME}`)

  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
    }),
  )
  console.log('OK  server-side write')

  const head = await client.send(
    new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  )
  console.log(`OK  server-side read (${head.ContentLength} bytes)`)

  const presignedKey = `healthcheck/presigned-${Date.now()}.txt`
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: presignedKey,
      ContentType: 'text/plain',
    }),
    { expiresIn: 60 },
  )
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body,
  })

  if (!response.ok) {
    throw new Error(
      `Presigned upload failed with HTTP ${response.status}: ${await response.text()}`,
    )
  }
  console.log('OK  presigned upload')

  await client.send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  )
  await client.send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: presignedKey }),
  )
  console.log('OK  cleanup')
  console.log(
    '\nR2 is configured correctly. Remember to add the bucket CORS rule for the browser.',
  )
}

main().catch((error) => {
  console.error(`\nR2 check failed: ${error.name}: ${error.message}`)
  process.exit(1)
})
