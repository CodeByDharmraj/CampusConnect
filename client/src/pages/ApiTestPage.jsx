
import { useEffect, useState } from 'react'
import { announcementService } from '../services/announcementService.js'
import { systemService } from '../services/systemService.js'

export default function ApiTestPage() {
    const [status, setStatus] = useState('Loading...')
    const [result, setResult] = useState(null)

    useEffect(() => {
        const controller = new AbortController()

        async function checkApi() {
            try {
                const data = await systemService.getHealth(
                    controller.signal,
                  )

                if (controller.signal.aborted) return

                setResult(data)
                setStatus('Request succeeded')
            } catch (error) {
                if (error.name === 'AbortError') return

                setStatus(
                    `${error.name}: ${error.message}`,
                )
            }
        }

        checkApi()

        return () => controller.abort()
    }, [])

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-bold">
                API Connection Test
            </h1>

            <p className="text-[var(--color-muted)]">
                Status: {status}
            </p>

            {result && (
                <pre className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
                    {JSON.stringify(result, null, 2)}
                </pre>
            )}
        </section>
    )
}
